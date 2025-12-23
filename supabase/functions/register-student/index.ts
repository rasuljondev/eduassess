// Supabase Edge Function: register-student
// Creates or links student accounts (called by Bot OR Website)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterRequest {
  surname: string;
  name: string;
  phone_number: string;
  telegram_id?: number;
  telegram_username?: string;
}

// Generate login from name + phone_number (e.g., "rasuljon2200880")
function generateLogin(name: string, phone_number: string): string {
  // Remove spaces and special characters from name and phone
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanPhone = phone_number.replace(/[^0-9]/g, '');
  
  // Combine: name + phone
  return `${cleanName}${cleanPhone}`;
}

// Check if login already exists and generate unique one if needed
async function ensureUniqueLogin(
  supabaseAdmin: any,
  baseLogin: string
): Promise<string> {
  let login = baseLogin;
  let counter = 0;
  const maxAttempts = 100;

  while (counter < maxAttempts) {
    const { data: existing } = await supabaseAdmin
      .from('global_users')
      .select('login')
      .eq('login', login)
      .maybeSingle();

    if (!existing) {
      return login; // Login is unique
    }

    // Login exists, try with counter suffix
    counter++;
    login = `${baseLogin}${counter}`;
  }

  // Fallback: add random suffix if all attempts failed
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${baseLogin}_${randomSuffix}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const fixedPassword = Deno.env.get('FIXED_STUDENT_PASSWORD') ?? '12345678';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Admin client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse request body
    const body: RegisterRequest = await req.json();
    const { surname, name, phone_number, telegram_id, telegram_username } = body;

    // Validate input
    if (!surname || !name || !phone_number) {
      return new Response(
        JSON.stringify({ error: 'surname, name, and phone_number are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if user already exists (by surname + name + phone)
    const { data: existingUsers, error: searchError } = await supabaseAdmin
      .from('global_users')
      .select('*')
      .eq('surname', surname)
      .eq('name', name)
      .eq('phone_number', phone_number);

    if (searchError) {
      throw new Error(`Database search failed: ${searchError.message}`);
    }

    // Case 1: User exists and already has telegram linked
    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0];

      if (existingUser.telegram_id && telegram_id) {
        // Account already linked to another telegram
        return new Response(
          JSON.stringify({
            success: false,
            error: 'This account is already linked to another Telegram user',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        );
      }

      // Case 2: User exists but no telegram - link it
      if (!existingUser.telegram_id && telegram_id) {
        const { error: updateError } = await supabaseAdmin
          .from('global_users')
          .update({
            telegram_id,
            telegram_username,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);

        if (updateError) {
          throw new Error(`Failed to link Telegram: ${updateError.message}`);
        }

        return new Response(
          JSON.stringify({
            success: true,
            login: existingUser.login,
            password: fixedPassword,
            is_new: false,
            telegram_linked: true,
            message: 'Account found and linked to Telegram',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Case 3: User exists, return existing credentials
      return new Response(
        JSON.stringify({
          success: true,
          login: existingUser.login,
          password: fixedPassword,
          is_new: false,
          telegram_linked: !!existingUser.telegram_id,
          message: 'Account already exists',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Case 4: New user - create account
    const baseLogin = generateLogin(name, phone_number);
    const login = await ensureUniqueLogin(supabaseAdmin, baseLogin);
    const email = `${login}@temp.exam.uz`;

    // Create auth user
    const { data: newUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: fixedPassword,
      email_confirm: true,
      user_metadata: {
        login,
        surname,
        name,
        phone_number,
        is_student: true,
      },
    });

    if (createAuthError || !newUser.user) {
      throw new Error(`Failed to create auth user: ${createAuthError?.message}`);
    }

    // Insert into global_users table
    const { error: insertError } = await supabaseAdmin.from('global_users').insert({
      login,
      surname,
      name,
      phone_number,
      telegram_id: telegram_id || null,
      telegram_username: telegram_username || null,
      auth_user_id: newUser.user.id,
    });

    if (insertError) {
      // Rollback: delete auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      } catch {
        // Ignore rollback errors
      }
      throw new Error(`Failed to create user record: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        login,
        password: fixedPassword,
        is_new: true,
        telegram_linked: !!telegram_id,
        message: 'Account created successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
    );
  } catch (error) {
    console.error('Error in register-student:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

