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

    console.log(`[delete-student] User found: ${user_id}, auth_user_id: ${authUserId}`);

    // Delete in order (respecting foreign key constraints):
    // 1. Get submission IDs first
    const { data: submissions, error: submissionsFetchError } = await supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('user_id', user_id);

    if (submissionsFetchError) {
      console.error('[delete-student] Error fetching submissions:', submissionsFetchError);
    }

    const submissionIds = (submissions || []).map((s: any) => s.id);
    console.log(`[delete-student] Found ${submissionIds.length} submissions to delete`);

    // 2. Delete scores by BOTH submission_id AND user_id (to catch all scores)
    // Scores can be referenced by submission_id (primary key) or user_id (direct reference)
    let scoresDeleted = 0;
    
    // Delete scores by submission_id
    if (submissionIds.length > 0) {
      const { data: scoresBySubmission, error: scoresBySubError } = await supabaseAdmin
        .from('scores')
        .delete()
        .in('submission_id', submissionIds)
        .select('submission_id');

      if (scoresBySubError) {
        console.error('[delete-student] Error deleting scores by submission_id:', scoresBySubError);
      } else {
        scoresDeleted += scoresBySubmission?.length || 0;
        console.log(`[delete-student] Deleted ${scoresBySubmission?.length || 0} scores by submission_id`);
      }
    }

    // Delete scores by user_id (direct reference - catches any scores not linked via submissions)
    const { data: scoresByUser, error: scoresByUserError } = await supabaseAdmin
      .from('scores')
      .delete()
      .eq('user_id', user_id)
      .select('submission_id');

    if (scoresByUserError) {
      console.error('[delete-student] Error deleting scores by user_id:', scoresByUserError);
    } else {
      const newScoresDeleted = scoresByUser?.length || 0;
      if (newScoresDeleted > 0) {
        scoresDeleted += newScoresDeleted;
        console.log(`[delete-student] Deleted ${newScoresDeleted} additional scores by user_id`);
      }
    }

    console.log(`[delete-student] Total scores deleted: ${scoresDeleted}`);

    // 3. Delete submissions
    const { error: submissionsError } = await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('user_id', user_id);

    if (submissionsError) {
      console.error('[delete-student] Error deleting submissions:', submissionsError);
      throw new Error(`Failed to delete submissions: ${submissionsError.message}`);
    } else {
      console.log(`[delete-student] Deleted ${submissionIds.length} submissions`);
    }

    // 4. Exam attempts
    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from('exam_attempts')
      .delete()
      .eq('user_id', user_id)
      .select('id');

    if (attemptsError) {
      console.error('[delete-student] Error deleting exam_attempts:', attemptsError);
      throw new Error(`Failed to delete exam attempts: ${attemptsError.message}`);
    } else {
      console.log(`[delete-student] Deleted ${attempts?.length || 0} exam attempts`);
    }

    // 5. Exam requests
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('exam_requests')
      .delete()
      .eq('user_id', user_id)
      .select('id');

    if (requestsError) {
      console.error('[delete-student] Error deleting exam_requests:', requestsError);
      throw new Error(`Failed to delete exam requests: ${requestsError.message}`);
    } else {
      console.log(`[delete-student] Deleted ${requests?.length || 0} exam requests`);
    }

    // 6. Global user record (delete last, after all related data)
    const { error: userDeleteError } = await supabaseAdmin
      .from('global_users')
      .delete()
      .eq('id', user_id);

    if (userDeleteError) {
      throw new Error(`Failed to delete user record: ${userDeleteError.message}`);
    }

    console.log(`[delete-student] Deleted global_user record: ${user_id}`);

    // 7. Auth user (if exists) - delete last
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
    console.log(`[delete-student] Summary:
      - Submissions: ${submissionIds.length}
      - Scores: ${scoresDeleted}
      - Exam Attempts: ${attempts?.length || 0}
      - Exam Requests: ${requests?.length || 0}
      - Global User: 1
      - Auth User: ${authUserId ? 1 : 0}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User and all related data deleted successfully',
        deleted: {
          submissions: submissionIds.length,
          scores: scoresDeleted,
          exam_attempts: attempts?.length || 0,
          exam_requests: requests?.length || 0,
        }
      }),
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

