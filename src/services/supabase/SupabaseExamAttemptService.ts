import type { ExamAttemptService } from '../ExamAttemptService';
import type { ExamAttempt, Submission } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabaseExamAttemptService implements ExamAttemptService {
  async getUserAttempts(centerId: string): Promise<ExamAttempt[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get global user
    const { data: globalUser } = await supabase
      .from('global_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!globalUser) {
      throw new Error('User profile not found');
    }

    const { data, error } = await supabase
      .from('exam_attempts')
      .select(`
        *,
        global_users!inner(id, login, surname, name),
        centers!inner(id, slug, name),
        tests(id, name)
      `)
      .eq('user_id', globalUser.id)
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attempts:', error);
      return [];
    }

    return data || [];
  }

  async getAllUserAttempts(): Promise<ExamAttempt[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get global user
    const { data: globalUser } = await supabase
      .from('global_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!globalUser) {
      throw new Error('User profile not found');
    }

    const { data, error } = await supabase
      .from('user_exam_history')
      .select('*')
      .eq('user_id', globalUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all attempts:', error);
      return [];
    }

    return data || [];
  }

  async getAttempt(attemptId: string): Promise<ExamAttempt | null> {
    const { data, error } = await supabase
      .from('exam_attempts')
      .select(`
        *,
        global_users!inner(id, login, surname, name),
        centers!inner(id, slug, name),
        tests(id, name)
      `)
      .eq('id', attemptId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching attempt:', error);
      return null;
    }

    return data;
  }

  async getActiveAttempt(centerId: string, examType: string): Promise<ExamAttempt | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Get global user
    const { data: globalUser } = await supabase
      .from('global_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!globalUser) return null;

    const { data, error } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('user_id', globalUser.id)
      .eq('center_id', centerId)
      .eq('exam_type', examType)
      .in('status', ['ready', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active attempt:', error);
      return null;
    }

    return data;
  }

  async startAttempt(attemptId: string): Promise<ExamAttempt> {
    const { data, error } = await supabase.functions.invoke('start-exam-attempt', {
      body: {
        attempt_id: attemptId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to start exam');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to start exam');
    }

    return data.attempt;
  }

  async submitAttempt(attemptId: string, answers: any): Promise<Submission> {
    // Get attempt details
    const attempt = await this.getAttempt(attemptId);
    
    if (!attempt) {
      throw new Error('Exam attempt not found');
    }

    // Check if expired
    if (attempt.expires_at && new Date(attempt.expires_at) < new Date()) {
      throw new Error('Exam time has expired');
    }

    // Get global user with full name
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: globalUser } = await supabase
      .from('global_users')
      .select('id, phone_number, surname, name')
      .eq('auth_user_id', user.id)
      .single();

    if (!globalUser) {
      throw new Error('User profile not found');
    }

    // Construct full name from surname and name
    const fullName = [globalUser.surname, globalUser.name].filter(Boolean).join(' ') || globalUser.name || 'Unknown';

    // Create submission
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .insert({
        user_id: globalUser.id,
        center_id: attempt.center_id,
        exam: attempt.exam_type,
        test_id: attempt.test_id ?? null,
        student_full_name: fullName,
        phone_number: globalUser.phone_number ?? null,
        answers,
      })
      .select()
      .single();

    if (subError) {
      throw new Error(subError.message || 'Failed to submit exam');
    }

    // Update attempt status
    await supabase
      .from('exam_attempts')
      .update({
        status: 'submitted',
        submission_id: submission.id,
      })
      .eq('id', attemptId);

    return submission;
  }
}

