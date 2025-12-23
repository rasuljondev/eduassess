import type { AuthService } from '../AuthService';
import type { User } from '../../types';
import { supabase } from '../../lib/supabase';

const FIXED_PASSWORD = '12345678'; // Fixed password for all students

export class SupabaseAuthService implements AuthService {
  async login(loginOrEmail: string, password?: string): Promise<User> {
    // Support login-only (password is optional and uses fixed password)
    const actualPassword = password || FIXED_PASSWORD;
    
    // Convert login to email format for Supabase Auth
    const normalizedEmail =
      loginOrEmail.includes('@') ? loginOrEmail.trim() : `${loginOrEmail.trim()}@temp.exam.uz`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: actualPassword,
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Login failed');
    }

    // Try to get profile (for admins)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, center_id, full_name')
      .eq('user_id', data.user.id)
      .maybeSingle();

    // If profile exists, user is an admin
    if (profile) {
      const roleMap: Record<string, 'STUDENT' | 'CENTER_ADMIN' | 'SUPER_ADMIN'> = {
        'student': 'STUDENT',
        'center_admin': 'CENTER_ADMIN',
        'superadmin': 'SUPER_ADMIN',
      };

      let centerSlug: string | undefined = undefined;
      
      if (profile.center_id) {
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
        login: loginOrEmail.includes('@') ? (data.user.email || '') : loginOrEmail.trim(),
        role: roleMap[profile.role] || 'STUDENT',
        centerSlug,
        fullName: profile.full_name || undefined,
      };
    }

    // User is a student - get from global_users
    const { data: globalUser, error: userError } = await supabase
      .from('global_users')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (userError || !globalUser) {
      await supabase.auth.signOut();
      throw new Error('User profile not found. Please register first.');
    }

    return {
      id: data.user.id,
      login: globalUser.login,
      role: 'STUDENT',
      fullName: `${globalUser.surname} ${globalUser.name}`,
    };
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Try to get profile (for admins)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, center_id, full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    // If profile exists, user is an admin
    if (profile) {
      const roleMap: Record<string, 'STUDENT' | 'CENTER_ADMIN' | 'SUPER_ADMIN'> = {
        'student': 'STUDENT',
        'center_admin': 'CENTER_ADMIN',
        'superadmin': 'SUPER_ADMIN',
      };

      let centerSlug: string | undefined = undefined;
      
      if (profile.center_id) {
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
        fullName: profile.full_name || undefined,
      };
    }

    // User is a student - get from global_users
    const { data: globalUser } = await supabase
      .from('global_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!globalUser) return null;

    return {
      id: user.id,
      login: globalUser.login,
      role: 'STUDENT',
      fullName: `${globalUser.surname} ${globalUser.name}`,
    };
  }
}
