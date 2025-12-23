import type { CenterService, CreateCenterData, UpdateCenterData, CreateAdminData, CenterAdmin } from '../CenterService';
import type { Center } from '../../types';
import { supabase, supabaseAdmin } from '../../lib/supabase';

export class SupabaseCenterService implements CenterService {
  async getCenterBySlug(slug: string): Promise<Center | null> {
    const { data, error } = await supabase
      .from('centers')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      logoUrl: data.logo_path || undefined,
    };
  }

  async getAllCenters(): Promise<Center[]> {
    const { data, error } = await supabase
      .from('centers')
      .select('*')
      .order('name');

    if (error || !data) return [];

    return data.map(c => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      logoUrl: c.logo_path || undefined,
    }));
  }

  async createCenter(data: CreateCenterData): Promise<Center> {
    const { data: center, error } = await supabase
      .from('centers')
      .insert({
        name: data.name,
        slug: data.slug,
        logo_path: data.logoUrl || null,
      })
      .select()
      .single();

    if (error || !center) {
      throw new Error(error?.message || 'Failed to create center');
    }

    return {
      id: center.id,
      slug: center.slug,
      name: center.name,
      logoUrl: center.logo_path || undefined,
    };
  }

  async updateCenter(id: string, data: UpdateCenterData): Promise<Center> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.logoUrl !== undefined) updateData.logo_path = data.logoUrl || null;

    const { data: center, error } = await supabase
      .from('centers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !center) {
      throw new Error(error?.message || 'Failed to update center');
    }

    return {
      id: center.id,
      slug: center.slug,
      name: center.name,
      logoUrl: center.logo_path || undefined,
    };
  }

  async deleteCenter(id: string): Promise<void> {
    const { error } = await supabase
      .from('centers')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Failed to delete center');
    }
  }

  async createCenterAdmin(centerId: string, adminData: CreateAdminData): Promise<CenterAdmin> {
    // WARNING: Using service role key in frontend is a security risk!
    // For production, use Supabase Edge Functions instead.
    
    if (!supabaseAdmin) {
      throw new Error(
        'Service role key not configured. ' +
        'Please add VITE_SUPABASE_ROLE_KEY to your .env file, or use Supabase Edge Functions for production.'
      );
    }
    
    try {
      // Create auth user - This requires service role key!
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminData.email,
        password: adminData.password,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        if (authError?.message?.includes('JWT') || authError?.status === 401) {
          throw new Error(
            'Admin API requires service role key. ' +
            'Please set up Supabase Edge Functions or use the Supabase Dashboard to create admin users. ' +
            'See ADMIN_API_SETUP.md for instructions.'
          );
        }
        throw new Error(authError?.message || 'Failed to create admin user');
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          role: 'center_admin',
          center_id: centerId,
          full_name: adminData.fullName || null,
          telegram_id: adminData.telegramId || null,
        });

      if (profileError) {
        // Cleanup: delete the auth user if profile creation fails
        try {
          if (supabaseAdmin) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          }
        } catch {
          // Ignore cleanup errors
        }
        throw new Error(profileError.message || 'Failed to create admin profile');
      }

      return {
        id: authData.user.id,
        email: adminData.email,
        fullName: adminData.fullName,
        centerId,
      };
    } catch (err: any) {
      throw err;
    }
  }

  async getCenterAdmins(centerId: string): Promise<CenterAdmin[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, center_id, telegram_id')
      .eq('center_id', centerId)
      .eq('role', 'center_admin');

    if (error || !profiles) return [];

    // Get user emails using admin API if available
    const adminPromises = profiles.map(async (profile) => {
      try {
        if (supabaseAdmin) {
          const { data: user } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
          return {
            id: profile.user_id,
            email: user?.user?.email || 'email@hidden.com',
            fullName: profile.full_name || undefined,
            centerId: profile.center_id,
            telegramId: profile.telegram_id || undefined,
          };
        } else {
          // Fallback: return without email if admin API not available
          return {
            id: profile.user_id,
            email: 'email@hidden.com', // Placeholder
            fullName: profile.full_name || undefined,
            centerId: profile.center_id,
            telegramId: profile.telegram_id || undefined,
          };
        }
      } catch {
        // Fallback: return without email if admin API not available
        return {
          id: profile.user_id,
          email: 'email@hidden.com', // Placeholder
          fullName: profile.full_name || undefined,
          centerId: profile.center_id,
        };
      }
    });

    return Promise.all(adminPromises);
  }

  async updateCenterAdmin(adminId: string, data: Partial<CreateAdminData>): Promise<CenterAdmin> {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured. Cannot update admin user.');
    }

    // Update auth user if email or password changed
    if (data.email || data.password) {
      try {
        const updateData: any = {};
        if (data.email) updateData.email = data.email;
        if (data.password) updateData.password = data.password;

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(adminId, updateData);
        if (authError) {
          throw new Error(authError.message || 'Failed to update admin user');
        }
      } catch (err: any) {
        throw err;
      }
    }

    // Update profile
    if (data.fullName !== undefined || data.telegramId !== undefined) {
      const updateData: any = {};
      if (data.fullName !== undefined) updateData.full_name = data.fullName || null;
      if (data.telegramId !== undefined) updateData.telegram_id = data.telegramId || null;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', adminId);

      if (profileError) {
        throw new Error(profileError.message || 'Failed to update admin profile');
      }
    }

    // Fetch updated admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, full_name, center_id')
      .eq('user_id', adminId)
      .single();

    if (!profile) {
      throw new Error('Admin not found');
    }

    try {
      if (supabaseAdmin) {
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(adminId);
        return {
          id: adminId,
          email: user?.user?.email || 'email@hidden.com',
          fullName: profile.full_name || undefined,
          centerId: profile.center_id,
        };
      } else {
        return {
          id: adminId,
          email: 'email@hidden.com',
          fullName: profile.full_name || undefined,
          centerId: profile.center_id,
        };
      }
    } catch {
      return {
        id: adminId,
        email: 'email@hidden.com',
        fullName: profile.full_name || undefined,
        centerId: profile.center_id,
      };
    }
  }

  async deleteCenterAdmin(adminId: string): Promise<void> {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured. Cannot delete admin user.');
    }

    // Delete profile first
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', adminId);

    if (profileError) {
      throw new Error(profileError.message || 'Failed to delete admin profile');
    }

    // Delete auth user (requires service role)
    try {
      await supabaseAdmin.auth.admin.deleteUser(adminId);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete auth user');
    }
  }
}
