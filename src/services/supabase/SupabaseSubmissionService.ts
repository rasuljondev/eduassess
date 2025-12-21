import type { SubmissionService, SubmitTestData } from '../SubmissionService';
import type { Submission, SubmissionWithDetails } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabaseSubmissionService implements SubmissionService {
  async submitTest(sessionId: string, fullName: string, data: SubmitTestData): Promise<Submission> {
    // sessionId is passed as the current user's id from ExamShell; we rely on auth + student_access.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Students can read their own access record (RLS), use it to populate submission fields
    const { data: access, error: accessErr } = await supabase
      .from('student_access')
      .select('generated_student_id, center_id, exam, expires_at')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (accessErr) throw new Error(accessErr.message);
    if (!access) throw new Error('No active exam access found.');

    const expiresAt = new Date(access.expires_at);
    if (Date.now() > expiresAt.getTime()) throw new Error('Session expired');

    const insertData: any = {
      generated_student_id: access.generated_student_id,
      center_id: access.center_id,
      exam: access.exam,
      student_full_name: fullName,
      answers: data.answers,
    };

    // Add optional fields
    if (data.testId) insertData.test_id = data.testId;
    if (data.phoneNumber) insertData.phone_number = data.phoneNumber;

    console.log('[SupabaseSubmissionService] Submitting with data:', {
      auth_user_id: user.id,
      generated_student_id: access.generated_student_id,
      center_id: access.center_id,
      exam: access.exam,
      test_id: data.testId,
    });

    // The RLS policy on submissions will ensure students can only insert their own records
    // No need for additional verification here
    const { data: inserted, error: insErr } = await supabase
      .from('submissions')
      .insert(insertData)
      .select('id, generated_student_id, student_full_name, answers, phone_number, test_id, created_at')
      .single();

    console.log('[SupabaseSubmissionService] Insert result:', { inserted, insErr });

    if (insErr || !inserted) throw new Error(insErr?.message || 'Failed to submit');

    return {
      id: inserted.id,
      sessionId: inserted.generated_student_id || sessionId,
      fullName: inserted.student_full_name,
      answers: inserted.answers,
      submittedAt: inserted.created_at,
    };
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
        generated_student_id,
        student_full_name,
        answers,
        phone_number,
        test_id,
        is_graded,
        graded_at,
        created_at,
        tests (
          name
        )
      `)
      .eq('center_id', center.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      sessionId: row.generated_student_id || 'unknown',
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
        generated_student_id,
        student_full_name,
        answers,
        phone_number,
        test_id,
        is_graded,
        graded_at,
        graded_by,
        created_at,
        tests ( name )
      `)
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      sessionId: row.generated_student_id,
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


