// Supabase Edge Function: create-exam-request
// Student requests to take an exam at a center

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  center_slug: string;
  exam_type: string;
  test_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Get JWT from header
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
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
    const { center_slug, exam_type, test_id } = body;

    if (!center_slug || !exam_type) {
      return new Response(
        JSON.stringify({ error: 'center_slug and exam_type are required' }),
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

    // Get center
    const { data: center, error: centerError } = await supabase
      .from('centers')
      .select('id, slug, name')
      .eq('slug', center_slug)
      .single();

    if (centerError || !center) {
      return new Response(
        JSON.stringify({ error: 'Center not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check for existing pending or approved request
    const { data: existingRequests, error: checkError } = await supabase
      .from('exam_requests')
      .select('id, status')
      .eq('user_id', globalUser.id)
      .eq('center_id', center.id)
      .eq('exam_type', exam_type)
      .in('status', ['pending', 'approved']);

    if (checkError) {
      throw new Error(`Failed to check existing requests: ${checkError.message}`);
    }

    if (existingRequests && existingRequests.length > 0) {
      const existing = existingRequests[0];
      return new Response(
        JSON.stringify({
          success: false,
          error: `You already have a ${existing.status} request for this exam`,
          existing_request_id: existing.id,
          status: existing.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Create exam request
    const { data: newRequest, error: insertError } = await supabase
      .from('exam_requests')
      .insert({
        user_id: globalUser.id,
        center_id: center.id,
        exam_type,
        test_id: test_id || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create exam request: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        request: newRequest,
        message: 'Exam request submitted successfully. Waiting for admin approval.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    );
  } catch (error) {
    console.error('Error in create-exam-request:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

