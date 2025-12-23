// Supabase Edge Function: approve-exam-request
// Admin approves or rejects exam request, creates exam_attempt if approved

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  request_id: string;
  action: 'approve' | 'reject';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Get JWT from header
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse request
    const body: RequestBody = await req.json();
    const { request_id, action } = body;

    if (!request_id || !action) {
      return new Response(
        JSON.stringify({ error: 'request_id and action are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return new Response(
        JSON.stringify({ error: 'action must be "approve" or "reject"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get exam request
    const { data: examRequest, error: requestError } = await supabase
      .from('exam_requests')
      .select('*, global_users!inner(id, login, surname, name, telegram_id)')
      .eq('id', request_id)
      .single();

    if (requestError || !examRequest) {
      return new Response(
        JSON.stringify({ error: 'Exam request not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Verify admin has permission (admin for this center or superadmin)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, center_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Admin profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const isAuthorized =
      profile.role === 'superadmin' ||
      (profile.role === 'center_admin' && profile.center_id === examRequest.center_id);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to manage requests for this center' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check if already reviewed
    if (examRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Request already ${examRequest.status}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    if (action === 'reject') {
      // Simple rejection - update status
      const { error: updateError } = await supabaseAdmin
        .from('exam_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', request_id);

      if (updateError) {
        throw new Error(`Failed to reject request: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Exam request rejected',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Approve - update request and create exam_attempt
    const { error: updateError } = await supabaseAdmin
      .from('exam_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', request_id);

    if (updateError) {
      throw new Error(`Failed to approve request: ${updateError.message}`);
    }

    // Create exam_attempt (status='ready', timer hasn't started yet)
    const { data: newAttempt, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .insert({
        user_id: examRequest.user_id,
        exam_request_id: request_id,
        center_id: examRequest.center_id,
        exam_type: examRequest.exam_type,
        test_id: examRequest.test_id,
        status: 'ready',
      })
      .select()
      .single();

    if (attemptError) {
      // Rollback approval
      await supabaseAdmin
        .from('exam_requests')
        .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
        .eq('id', request_id);

      throw new Error(`Failed to create exam attempt: ${attemptError.message}`);
    }

    // TODO: Send notification to student (via Telegram if available)
    // This could be enhanced to send a notification

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Exam request approved',
        attempt: newAttempt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in approve-exam-request:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

