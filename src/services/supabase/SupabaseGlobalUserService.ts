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

    return data || [];
  }
}

