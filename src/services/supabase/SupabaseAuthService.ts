import type { AuthService } from '../AuthService';
import type { User } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabaseAuthService implements AuthService {
  async login(email: string, password: string): Promise<User> {
    // Support code-only login for students (e.g. test_ielts_ab12c)
    // We store auth users as `${login}@temp.exam.uz` internally.
    const normalizedEmail =
      email.includes('@') ? email.trim() : `${email.trim()}@temp.exam.uz`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Login failed');
    }

    // Fetch profile to get role and center info
    // Note: Using a direct query to avoid RLS recursion issues
    // The RLS policy might cause recursion if is_superadmin() queries profiles
    let profile: { role: string; center_id: string | null; full_name: string | null } | null = null;
    let profileError: any = null;

    try {
      const result = await supabase
        .from('profiles')
        .select('role, center_id, full_name')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      profile = result.data;
      profileError = result.error;
    } catch (err: any) {
      // If we get a stack depth error, it's likely an RLS recursion issue
      if (err?.code === '54001' || err?.message?.includes('stack depth')) {
        throw new Error(
          'Database configuration error: RLS policy recursion detected. ' +
          'Please fix the is_superadmin() function or profiles RLS policy. ' +
          'The is_superadmin() function should not query profiles table to avoid recursion.'
        );
      }
      profileError = err;
    }

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Provide more helpful error message
      if (profileError.code === '54001') {
        throw new Error(
          'Database error: Recursive RLS policy detected. ' +
          'The profiles table RLS policy is calling is_superadmin() which queries profiles, causing infinite recursion. ' +
          'Please update your database: the is_superadmin() function should use security definer or cache the result.'
        );
      }
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error('User profile not found. Please contact administrator to create your profile.');
    }

    // Map database role to app role
    const roleMap: Record<string, 'STUDENT' | 'CENTER_ADMIN' | 'SUPER_ADMIN'> = {
      'student': 'STUDENT',
      'center_admin': 'CENTER_ADMIN',
      'superadmin': 'SUPER_ADMIN',
    };

    // Get center slug and test type
    let centerSlug: string | undefined = undefined;
    let testType: User['testType'] | undefined = undefined;
    
    if (profile.role === 'student') {
      // For students, get center and exam info from generated_students/student_access
      // Fetch student record status
      const { data: studentRecord } = await supabase
        .from('generated_students')
        .select('id, status, center_id, exam, test_name')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      // BLOCK RE-LOGIN: Users cannot login again if they have already logged in once (in_progress or submitted)
      if (studentRecord && studentRecord.status !== 'unused') {
        const msg = studentRecord.status === 'submitted' 
          ? 'This test has already been completed.' 
          : 'This test link has already been used. One-time login only.';
        await supabase.auth.signOut();
        throw new Error(msg);
      }

      const { data: access } = await supabase
        .from('student_access')
        .select('exam, expires_at, center_id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (!access) {
        await supabase.auth.signOut();
        throw new Error('No active exam access found for this user.');
      }

      const expiresAt = new Date(access.expires_at);
      if (Date.now() > expiresAt.getTime()) {
        await supabase.auth.signOut();
        throw new Error('Session expired');
      }

      // First time login: Mark as in_progress and record 'login' event for analytics
      if (studentRecord && studentRecord.status === 'unused') {
        await Promise.all([
          supabase
            .from('generated_students')
            .update({ status: 'in_progress' })
            .eq('id', studentRecord.id),
          supabase
            .from('student_usage_events')
            .insert({
              center_id: studentRecord.center_id,
              generated_student_id: studentRecord.id,
              exam: studentRecord.exam,
              test_name: studentRecord.test_name,
              event_type: 'login'
            })
        ]);
      }

      const exam = String(access.exam || '').toUpperCase();
      const map: Record<string, User['testType']> = {
        IELTS: 'IELTS',
        SAT: 'SAT',
        APTIS: 'APTIS',
        MULTI_LEVEL: 'MULTI_LEVEL',
      };
      testType = map[exam];
      
      // Get center slug from student_access center_id
      if (access.center_id) {
        const { data: center } = await supabase
          .from('centers')
          .select('slug')
          .eq('id', access.center_id)
          .single();

        if (center) {
          centerSlug = center.slug;
        }
      }
    } else if (profile.center_id) {
      // For admins, get center from profile
      const { data: center } = await supabase
        .from('centers')
        .select('slug')
        .eq('id', profile.center_id)
        .single();

      if (center) {
        centerSlug = center.slug;
      }
    }

    return {
      id: data.user.id,
      login: email.includes('@') ? (data.user.email || '') : email.trim(),
      role: roleMap[profile.role] || 'STUDENT',
      centerSlug,
      testType,
      fullName: profile.full_name || undefined,
    };
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, center_id, full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return null;

    const roleMap: Record<string, 'STUDENT' | 'CENTER_ADMIN' | 'SUPER_ADMIN'> = {
      'student': 'STUDENT',
      'center_admin': 'CENTER_ADMIN',
      'superadmin': 'SUPER_ADMIN',
    };

    // Get center slug - for students, get it from student_access; for admins, from profile
    let centerSlug: string | undefined = undefined;
    let testType: User['testType'] | undefined = undefined;
    
    if (profile.role === 'student') {
      // For students, get center and exam from student_access
      const { data: access } = await supabase
        .from('student_access')
        .select('exam, expires_at, center_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (access) {
        const expiresAt = new Date(access.expires_at);
        if (Date.now() <= expiresAt.getTime()) {
          const exam = String(access.exam || '').toUpperCase();
          const map: Record<string, User['testType']> = {
            IELTS: 'IELTS',
            SAT: 'SAT',
            APTIS: 'APTIS',
            MULTI_LEVEL: 'MULTI_LEVEL',
          };
          testType = map[exam];
          
          // Get center slug from student_access center_id
          if (access.center_id) {
            const { data: center } = await supabase
              .from('centers')
              .select('slug')
              .eq('id', access.center_id)
              .single();
            
            if (center) {
              centerSlug = center.slug;
            }
          }
        }
      }
    } else if (profile.center_id) {
      // For admins, get center from profile
      const { data: center } = await supabase
        .from('centers')
        .select('slug')
        .eq('id', profile.center_id)
        .single();
      
      if (center) {
        centerSlug = center.slug;
      }
    }

    return {
      id: user.id,
      login: user.email || '',
      role: roleMap[profile.role] || 'STUDENT',
      centerSlug,
      testType,
      fullName: profile.full_name || undefined,
    };
  }
}

