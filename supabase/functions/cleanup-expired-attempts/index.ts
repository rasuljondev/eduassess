// Supabase Edge Function: cleanup-expired-attempts
// Marks expired exam attempts (6h timer) - does NOT delete users
// Run periodically via cron

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Call the database function to cleanup expired attempts
    const { data, error } = await supabaseAdmin.rpc('cleanup_expired_attempts');

    if (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: data?.expired_count || 0,
        timestamp: data?.timestamp || new Date().toISOString(),
        message: `Marked ${data?.expired_count || 0} attempts as expired`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in cleanup-expired-attempts:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

