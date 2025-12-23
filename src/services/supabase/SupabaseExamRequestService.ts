import type { ExamRequestService } from '../ExamRequestService';
import type { ExamRequest } from '../../types';
import { supabase } from '../../lib/supabase';

export class SupabaseExamRequestService implements ExamRequestService {
  async createRequest(data: {
    center_id: string;
    exam_type: string;
    test_id?: string;
  }): Promise<ExamRequest> {
    // Call create-exam-request Edge Function
    const { data: result, error } = await supabase.functions.invoke('create-exam-request', {
      body: {
        center_slug: data.center_id, // Assuming center_id is actually slug
        exam_type: data.exam_type,
        test_id: data.test_id,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create exam request');
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to create exam request');
    }

    return result.request;
  }

  async getUserRequests(centerId: string): Promise<ExamRequest[]> {
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
      .from('exam_requests')
      .select(`
        *,
        global_users!inner(id, login, surname, name),
        centers!inner(id, slug, name),
        tests(id, name)
      `)
      .eq('user_id', globalUser.id)
      .eq('center_id', centerId)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return [];
    }

    return data || [];
  }

  async getUserRequestStatus(centerId: string, examType: string): Promise<ExamRequest | null> {
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
      .from('exam_requests')
      .select('*')
      .eq('user_id', globalUser.id)
      .eq('center_id', centerId)
      .eq('exam_type', examType)
      .in('status', ['pending', 'approved'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking request status:', error);
      return null;
    }

    return data;
  }

  async listPendingRequests(centerId: string): Promise<ExamRequest[]> {
    const { data, error } = await supabase
      .from('exam_requests')
      .select(`
        *,
        global_users!inner(id, login, surname, name),
        centers!inner(id, slug, name),
        tests(id, name)
      `)
      .eq('center_id', centerId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }

    return data || [];
  }

  async listAllRequests(centerId: string): Promise<ExamRequest[]> {
    const { data, error } = await supabase
      .from('exam_requests')
      .select(`
        *,
        global_users!inner(id, login, surname, name),
        centers!inner(id, slug, name),
        tests(id, name)
      `)
      .eq('center_id', centerId)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return [];
    }

    return data || [];
  }

  async approveRequest(requestId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('approve-exam-request', {
      body: {
        request_id: requestId,
        action: 'approve',
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to approve request');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to approve request');
    }
  }

  async rejectRequest(requestId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('approve-exam-request', {
      body: {
        request_id: requestId,
        action: 'reject',
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to reject request');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to reject request');
    }
  }
}

