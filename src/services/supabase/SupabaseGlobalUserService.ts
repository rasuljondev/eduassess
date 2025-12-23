import type { GlobalUserService } from '../GlobalUserService';
import type { GlobalUser, ExamAttempt } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabaseGlobalUserService implements GlobalUserService {
  async register(data: {
    surname: string;
    name: string;
    phone_number: string;
  }): Promise<{ login: string; password: string }> {
    // Call register-student Edge Function
    const { data: result, error } = await supabase.functions.invoke('register-student', {
      body: {
        surname: data.surname,
        name: data.name,
        phone_number: data.phone_number,
      },
    });

    if (error) {
      throw new Error(error.message || 'Registration failed');
    }

    if (!result.success) {
      throw new Error(result.error || 'Registration failed');
    }

    return {
      login: result.login,
      password: result.password,
    };
  }

  async getCurrentUser(): Promise<GlobalUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    return this.getUserByAuthId(user.id);
  }

  async getUserByAuthId(authUserId: string): Promise<GlobalUser | null> {
    const { data, error } = await supabase
      .from('global_users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  }

  async getUserExamHistory(userId: string): Promise<ExamAttempt[]> {
    const { data, error } = await supabase
      .from('user_exam_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching exam history:', error);
      return [];
    }

    // Debug: Log the data to see what we're getting
    if (data && data.length > 0) {
      console.log('Exam history data:', data.map(item => ({
        attempt_id: item.attempt_id,
        status: item.status,
        final_score: item.final_score,
        is_published: item.is_published,
        submission_id: item.submission_id
      })));
    }

    return data || [];
  }

  async listAllUsers(limit = 50, offset = 0): Promise<{ users: GlobalUser[]; total: number }> {
    // Get total count
    const { count, error: countError } = await supabase
      .from('global_users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(countError.message || 'Failed to count users');
    }

    // Get users with pagination
    const { data, error } = await supabase
      .from('global_users')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(error.message || 'Failed to fetch users');
    }

    return {
      users: data || [],
      total: count || 0,
    };
  }

  async deleteUser(userId: string): Promise<void> {
    // Call Edge Function for safe deletion (handles cascading)
    const { error } = await supabase.functions.invoke('delete-student', {
      body: { user_id: userId },
    });

    if (error) {
      throw new Error(error.message || 'Failed to delete user');
    }
  }
}

