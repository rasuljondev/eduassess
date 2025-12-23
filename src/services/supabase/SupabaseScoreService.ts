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

    // If score is published, notify Telegram bot (non-blocking)
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

  private async notifyTelegramBot(submissionId: string, scoreData: any): Promise<void> {
    try {
      // Get submission details to find telegram_id (via global_users)
      const { data: submission, error: subErr } = await supabase
        .from('submissions')
        .select(`
          user_id,
          test_id,
          student_full_name,
          tests ( name )
        `)
        .eq('id', submissionId)
        .single();

      if (subErr || !submission) {
        console.error('Failed to get submission for notification:', subErr);
        return;
      }

      const { data: gu, error: guErr } = await supabase
        .from('global_users')
        .select('telegram_id, login')
        .eq('id', (submission as any).user_id)
        .maybeSingle();

      if (guErr || !gu || !gu.telegram_id) {
        // No telegram linked -> nothing to notify
        return;
      }

      const login = gu.login;
      const telegramId = Number(gu.telegram_id);
      const testName = (submission as any).tests?.name;
      const webhookUrl = import.meta.env.VITE_BOT_WEBHOOK_URL || 'http://localhost:3001';

      // Call bot webhook
      const response = await fetch(`${webhookUrl}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: telegramId,
          login,
          student_name: (submission as any).student_full_name,
          score: scoreData.final_score,
          testName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Bot webhook failed: ${response.status} - ${errorText}`);
      } else {
        console.log(`Successfully notified Telegram bot for login: ${login}`);
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

