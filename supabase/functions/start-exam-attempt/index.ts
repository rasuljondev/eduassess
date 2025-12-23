// Supabase Edge Function: start-exam-attempt
// Student starts exam, begins 6-hour timer

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  attempt_id: string;
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
    const { attempt_id } = body;

    if (!attempt_id) {
      return new Response(
        JSON.stringify({ error: 'attempt_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get global user
    const { data: globalUser, error: userError } = await supabase
      .from('global_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !globalUser) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get exam attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('id', attempt_id)
      .eq('user_id', globalUser.id)
      .single();

    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({ error: 'Exam attempt not found or you do not have permission' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check status
    if (attempt.status === 'in_progress') {
      // Already started, return existing attempt
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Exam already in progress',
          attempt,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (attempt.status === 'submitted') {
      return new Response(
        JSON.stringify({ error: 'Exam already submitted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    if (attempt.status === 'expired') {
      return new Response(
        JSON.stringify({ error: 'Exam attempt has expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 }
      );
    }

    if (attempt.status !== 'ready') {
      return new Response(
        JSON.stringify({ error: `Invalid attempt status: ${attempt.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Start the exam - set timer for 6 hours
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 6 * 60 * 60 * 1000); // 6 hours

    const { data: updatedAttempt, error: updateError } = await supabaseAdmin
      .from('exam_attempts')
      .update({
        status: 'in_progress',
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', attempt_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to start exam: ${updateError.message}`);
    }

    // Get test questions if test_id is specified
    let questions = null;
    if (attempt.test_id) {
      const { data: testQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, order_num')
        .eq('test_id', attempt.test_id)
        .order('order_num');

      if (!questionsError) {
        questions = testQuestions;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Exam started successfully',
        attempt: updatedAttempt,
        questions,
        expires_at: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in start-exam-attempt:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

