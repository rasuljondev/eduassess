import type { SubmissionService, SubmitTestData } from '../SubmissionService';
import type { Submission, SubmissionWithDetails } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabaseSubmissionService implements SubmissionService {
  async submitTest(sessionId: string, fullName: string, data: SubmitTestData): Promise<Submission> {
    // Legacy method: old architecture used student_access + generated_students.
    // New architecture submits via ExamAttemptService (attemptId-based flow).
    throw new Error('submitTest is deprecated. Use ExamAttemptService.submitAttempt(attemptId, answers, fullName).');
  }

  async getSubmissions(centerSlug: string): Promise<Submission[]> {
    // Resolve center id by slug
    const { data: center, error: centerErr } = await supabase
      .from('centers')
      .select('id')
      .eq('slug', centerSlug)
      .single();

    if (centerErr || !center) return [];

    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        user_id,
        student_full_name,
        answers,
        phone_number,
        test_id,
        is_graded,
        graded_at,
        created_at,
        tests (
          name
        ),
        global_users (
          login
        )
      `)
      .eq('center_id', center.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      sessionId: row.global_users?.login || row.user_id || 'unknown',
      fullName: row.student_full_name,
      answers: row.answers,
      submittedAt: row.created_at,
      phoneNumber: row.phone_number,
      testId: row.test_id,
      testName: row.tests?.name || 'Unknown Test',
      isGraded: row.is_graded || false,
      gradedAt: row.graded_at,
    } as any));
  }

  async markSubmissionAsGraded(submissionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('submissions')
      .update({ 
        is_graded: true, 
        graded_at: new Date().toISOString(), 
        graded_by: user.id 
      })
      .eq('id', submissionId);

    if (error) throw new Error(error.message);
  }

  async getSubmissionsWithDetails(centerId: string): Promise<SubmissionWithDetails[]> {
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id,
        user_id,
        student_full_name,
        answers,
        phone_number,
        test_id,
        is_graded,
        graded_at,
        graded_by,
        created_at,
        tests ( name ),
        global_users ( login )
      `)
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      sessionId: row.global_users?.login || row.user_id,
      fullName: row.student_full_name,
      answers: row.answers,
      submittedAt: row.created_at,
      phoneNumber: row.phone_number,
      testId: row.test_id,
      testName: row.tests?.name || 'Unknown Test',
      isGraded: row.is_graded || false,
      gradedAt: row.graded_at,
      gradedBy: row.graded_by,
    }));
  }
}


