// Supabase Edge Function to clean up expired test takers
// This should be scheduled to run every hour via Supabase Cron
// 
// To deploy:
// 1. supabase functions deploy cleanup-expired-users
// 2. Set up cron trigger in Supabase Dashboard:
//    - Go to Database > Cron Jobs
//    - Add new cron: "0 * * * *" (every hour)
//    - Function: cleanup-expired-users

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get service role key from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Call database function to get expired users
    const { data: result, error: dbError } = await supabaseAdmin.rpc(
      'cleanup_expired_test_takers'
    );

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    const deletedCount = result?.deleted_count || 0;
    const authUserIds = result?.auth_user_ids || [];

    // Delete auth users via admin API
    let deletedAuthUsers = 0;
    for (const userId of authUserIds) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (!deleteError) {
          deletedAuthUsers++;
        } else {
          console.error(`Failed to delete auth user ${userId}:`, deleteError);
        }
      } catch (err) {
        console.error(`Error deleting auth user ${userId}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_generated_students: deletedCount,
        deleted_auth_users: deletedAuthUsers,
        message: `Cleaned up ${deletedCount} expired test takers`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in cleanup function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

