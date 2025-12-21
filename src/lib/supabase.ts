import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Regular client with anon key (for normal operations)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role key (for admin operations only)
// WARNING: Service role key should NEVER be exposed in production frontend!
// Use Edge Functions or backend API instead for production.
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

if (!supabaseAdmin) {
  console.warn(
    'VITE_SUPABASE_ROLE_KEY not found. Admin operations (creating users) will not work. ' +
    'For production, use Supabase Edge Functions instead of exposing service role key.'
  );
}

