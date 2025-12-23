import type { ScoreService, ScoreData } from '../ScoreService';
import type { Score, TestType } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabaseScoreService implements ScoreService {
  async saveScore(submissionId: string, scoreData: ScoreData): Promise<Score> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get submission details to get center_id and exam
    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .select('center_id, exam')
      .eq('id', submissionId)
      .single();

    if (subErr || !submission) {
      throw new Error(subErr?.message || 'Submission not found');
    }

    // Check if score already exists
    const { data: existingScore } = await supabase
      .from('scores')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle();

    const scoreRecord: any = {
      submission_id: submissionId,
      center_id: submission.center_id,
      exam: submission.exam,
      manual_score: scoreData.manualScore || null,
      final_score: scoreData.finalScore,
      is_published: scoreData.isPublished ?? false,
      updated_at: new Date().toISOString(),
    };

    if (scoreData.isPublished && !existingScore?.published_at) {
      scoreRecord.published_at = new Date().toISOString();
    } else if (!scoreData.isPublished) {
      scoreRecord.published_at = null;
    }

    let result;
    if (existingScore) {
      // Update existing score
      const { data, error } = await supabase
        .from('scores')
        .update(scoreRecord)
        .eq('submission_id', submissionId)
        .select('*')
        .single();

      if (error || !data) throw new Error(error?.message || 'Failed to update score');
      result = data;
    } else {
      // Insert new score
      const { data, error } = await supabase
        .from('scores')
        .insert(scoreRecord)
        .select('*')
        .single();

      if (error || !data) throw new Error(error?.message || 'Failed to save score');
      result = data;
    }

    // Mark submission as graded
    await supabase
      .from('submissions')
      .update({
        is_graded: true,
        graded_at: new Date().toISOString(),
        graded_by: user.id,
      })
      .eq('id', submissionId);

    // If score is published, notify Telegram bot via Edge Function (non-blocking)
    if (scoreData.isPublished) {
      this.notifyTelegramBot(submissionId, result).catch(err => {
        console.error('Failed to notify Telegram bot:', err);
        // Don't fail the score save if bot notification fails
      });
    }

    return this.mapToScore(result);
  }

  async getScore(submissionId: string): Promise<Score | null> {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return this.mapToScore(data);
  }

  async getScoreByLogin(login: string): Promise<Score | null> {
    // New architecture: global_users.login -> submissions.user_id
    const { data: gu, error: guErr } = await supabase
      .from('global_users')
      .select('id')
      .eq('login', login)
      .maybeSingle();

    if (guErr || !gu) return null;

    const { data: submission } = await supabase
      .from('submissions')
      .select('id')
      .eq('user_id', gu.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!submission) return null;

    return this.getScore(submission.id);
  }

  async deleteScore(submissionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Get submission to find the exam attempt and associated data
    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .select('id, exam, center_id')
      .eq('id', submissionId)
      .single();

    if (subErr || !submission) {
      throw new Error(subErr?.message || 'Submission not found');
    }

    // 2. Find the exam attempt linked to this submission
    const { data: attempt, error: attemptErr } = await supabase
      .from('exam_attempts')
      .select('id, exam_request_id, user_id, center_id, exam_type, test_id')
      .eq('submission_id', submissionId)
      .maybeSingle();

    // 3. Delete the score record first
    const { error: deleteScoreError } = await supabase
      .from('scores')
      .delete()
      .eq('submission_id', submissionId);

    if (deleteScoreError) {
      throw new Error(deleteScoreError.message || 'Failed to delete score');
    }

    // 4. If we have an attempt, clear its submission_id reference
    // This MUST be done before deleting the submission due to FK constraints
    if (attempt) {
      const { error: updateAttemptError } = await supabase
        .from('exam_attempts')
        .update({
          submission_id: null,
          status: 'ready', // Temporary status
        })
        .eq('id', attempt.id);

      if (updateAttemptError) {
        console.error('Failed to clear attempt submission reference:', updateAttemptError);
      }
    }

    // 5. Delete the submission record
    const { error: deleteSubError } = await supabase
      .from('submissions')
      .delete()
      .eq('id', submissionId);

    if (deleteSubError) {
      throw new Error(deleteSubError.message || 'Failed to delete submission');
    }

    // 6. If we have an attempt, delete it and reset the original request
    if (attempt) {
      // Delete the attempt
      const { error: deleteAttemptError } = await supabase
        .from('exam_attempts')
        .delete()
        .eq('id', attempt.id);

      if (deleteAttemptError) {
        console.error('Failed to delete attempt:', deleteAttemptError);
      }

      // Reset the exam request so the student can request/start again
      if (attempt.exam_request_id) {
        const { error: updateRequestError } = await supabase
          .from('exam_requests')
          .update({
            status: 'approved', // Reset to approved so they can start a fresh attempt
            reviewed_at: null,
            reviewed_by: null,
          })
          .eq('id', attempt.exam_request_id);

        if (updateRequestError) {
          console.error('Failed to reset exam request:', updateRequestError);
        }
      }
    }
  }

  private async notifyTelegramBot(submissionId: string, scoreData: any): Promise<void> {
    try {
      // Call Supabase Edge Function to handle notification server-side
      const { data, error } = await supabase.functions.invoke('notify-score', {
        body: {
          submission_id: submissionId,
          score_data: scoreData,
        },
      });

      if (error) {
        console.error('Failed to invoke notify-score function:', error);
        return;
      }

      if (data?.success) {
        console.log('Successfully notified Telegram bot:', data.message);
      } else {
        console.warn('Notification result:', data);
      }
    } catch (err) {
      console.error('Error notifying Telegram bot:', err);
      // Don't throw - this is non-blocking
    }
  }

  private mapToScore(data: any): Score {
    return {
      submissionId: data.submission_id,
      centerId: data.center_id,
      exam: data.exam as TestType,
      autoScore: data.auto_score,
      manualScore: data.manual_score,
      finalScore: data.final_score,
      isPublished: data.is_published,
      publishedAt: data.published_at,
      updatedAt: data.updated_at,
    };
  }
}

