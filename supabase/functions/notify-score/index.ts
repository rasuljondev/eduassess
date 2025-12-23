import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  submission_id: string;
  score_data: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const botWebhookUrl = Deno.env.get('BOT_WEBHOOK_URL') ?? 'http://localhost:3001';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: RequestBody = await req.json();
    const { submission_id, score_data } = body;

    if (!submission_id || !score_data) {
      return new Response(
        JSON.stringify({ error: 'submission_id and score_data are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get submission details
    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .select(`
        user_id,
        test_id,
        student_full_name,
        tests ( name )
      `)
      .eq('id', submission_id)
      .single();

    if (subErr || !submission) {
      throw new Error(`Failed to get submission: ${subErr?.message || 'Not found'}`);
    }

    // Get global user with telegram_id
    const { data: gu, error: guErr } = await supabase
      .from('global_users')
      .select('telegram_id, login')
      .eq('id', (submission as any).user_id)
      .maybeSingle();

    if (guErr || !gu || !gu.telegram_id) {
      // No telegram linked -> nothing to notify
      return new Response(
        JSON.stringify({ success: true, message: 'No Telegram linked, skipping notification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const telegramId = Number(gu.telegram_id);
    const testName = (submission as any).tests?.name;

    // Call bot webhook (URL already includes /notify endpoint)
    const webhookUrl = botWebhookUrl.endsWith('/notify') 
      ? botWebhookUrl 
      : `${botWebhookUrl}/notify`;
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telegram_id: telegramId,
        login: gu.login,
        student_name: (submission as any).student_full_name,
        score: score_data.final_score,
        testName,
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Bot webhook failed: ${webhookResponse.status} - ${errorText}`);
      throw new Error(`Bot notification failed: ${errorText}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully notified Telegram bot for login: ${gu.login}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in notify-score:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

