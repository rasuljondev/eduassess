// Supabase Edge Function: delete-student
// Safely deletes a student user and all related data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteRequest {
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Admin client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse request body
    const body: DeleteRequest = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[delete-student] Starting deletion for user_id: ${user_id}`);

    // Get user info before deletion
    const { data: user, error: userError } = await supabaseAdmin
      .from('global_users')
      .select('auth_user_id')
      .eq('id', user_id)
      .maybeSingle();

    if (userError || !user) {
      throw new Error(`User not found: ${userError?.message || 'Unknown error'}`);
    }

    const authUserId = user.auth_user_id;

    // Delete in order (respecting foreign key constraints):
    // 1. Get submission IDs first
    const { data: submissions } = await supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('user_id', user_id);

    const submissionIds = (submissions || []).map((s: any) => s.id);

    // 2. Delete scores (references submissions)
    if (submissionIds.length > 0) {
      const { error: scoresError } = await supabaseAdmin
        .from('scores')
        .delete()
        .in('submission_id', submissionIds);

      if (scoresError) {
        console.error('[delete-student] Error deleting scores:', scoresError);
      }
    }

    // 3. Submissions
    const { error: submissionsError } = await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('user_id', user_id);

    if (submissionsError) {
      console.error('[delete-student] Error deleting submissions:', submissionsError);
    }

    // 4. Exam attempts
    const { error: attemptsError } = await supabaseAdmin
      .from('exam_attempts')
      .delete()
      .eq('user_id', user_id);

    if (attemptsError) {
      console.error('[delete-student] Error deleting exam_attempts:', attemptsError);
    }

    // 5. Exam requests
    const { error: requestsError } = await supabaseAdmin
      .from('exam_requests')
      .delete()
      .eq('user_id', user_id);

    if (requestsError) {
      console.error('[delete-student] Error deleting exam_requests:', requestsError);
    }

    // 6. Global user record
    const { error: userDeleteError } = await supabaseAdmin
      .from('global_users')
      .delete()
      .eq('id', user_id);

    if (userDeleteError) {
      throw new Error(`Failed to delete user record: ${userDeleteError.message}`);
    }

    // 7. Auth user (if exists)
    if (authUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        console.log(`[delete-student] Deleted auth user: ${authUserId}`);
      } catch (authError) {
        console.error('[delete-student] Error deleting auth user:', authError);
        // Don't fail if auth user already deleted
      }
    }

    console.log(`[delete-student] Successfully deleted user: ${user_id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[delete-student] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

