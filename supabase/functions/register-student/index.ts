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

// Normalize phone number: accept 992200880, save as +998992200880
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/[^0-9]/g, '');
  
  // If starts with 998, assume it's already with country code
  if (digits.startsWith('998')) {
    return `+${digits}`;
  }
  
  // If starts with 9 (Uzbek mobile), add +998
  if (digits.startsWith('9') && digits.length >= 9) {
    return `+998${digits}`;
  }
  
  // Otherwise, assume it's already formatted or add +998
  return digits.startsWith('+') ? digits : `+998${digits}`;
}

// Extract phone without country code for login generation (e.g., "992200880" -> "992200880")
function getPhoneWithoutCountryCode(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  
  // Remove 998 prefix if present
  if (digits.startsWith('998')) {
    return digits.substring(3);
  }
  
  return digits;
}

// Generate login from name + phone_number without country code (e.g., "javohir901234567")
function generateLogin(name: string, phone_number: string): string {
  // Remove spaces and special characters from name
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Get phone without country code
  const phoneWithoutCountry = getPhoneWithoutCountryCode(phone_number);
  
  // Combine: name + phone (without country code)
  return `${cleanName}${phoneWithoutCountry}`;
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

    console.log('[register-student] Starting registration request');
    console.log('[register-student] Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('[register-student] Service Key:', supabaseServiceKey ? 'Set' : 'Missing');
    console.log('[register-student] Fixed Password:', fixedPassword ? 'Set' : 'Missing');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[register-student] Missing Supabase environment variables');
      throw new Error('Missing Supabase environment variables');
    }

    // Admin client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse request body
    const body: RegisterRequest = await req.json();
    console.log('[register-student] Request body received:', {
      surname: body.surname,
      name: body.name,
      phone_number: body.phone_number,
      has_telegram_id: !!body.telegram_id,
    });

    // Normalize phone number (accept 992200880, save as +998992200880)
    const normalizedPhone = normalizePhoneNumber(body.phone_number);
    console.log('[register-student] Phone normalized:', body.phone_number, '->', normalizedPhone);

    const { surname, name, phone_number: originalPhone, telegram_id, telegram_username } = body;
    const phone_number = normalizedPhone;

    // Validate input
    if (!surname || !name || !phone_number) {
      console.error('[register-student] Validation failed:', { surname, name, phone_number });
      return new Response(
        JSON.stringify({ error: 'surname, name, and phone_number are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if user already exists (by surname + name + phone)
    // Note: phone_number in DB is stored as +998992200880, so we need to check both formats
    console.log('[register-student] Checking for existing user:', { surname, name, phone_number });
    const { data: existingUsers, error: searchError } = await supabaseAdmin
      .from('global_users')
      .select('*')
      .eq('surname', surname)
      .eq('name', name)
      .or(`phone_number.eq.${phone_number},phone_number.eq.${originalPhone}`);

    if (searchError) {
      console.error('[register-student] Database search error:', searchError);
      throw new Error(`Database search failed: ${searchError.message}`);
    }

    console.log('[register-student] Existing users found:', existingUsers?.length || 0);

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
    const baseLogin = generateLogin(name, originalPhone); // Use original phone (without country code) for login
    console.log('[register-student] Generated base login:', baseLogin);
    const login = await ensureUniqueLogin(supabaseAdmin, baseLogin);
    console.log('[register-student] Final login (after uniqueness check):', login);
    const email = `${login}@temp.exam.uz`;
    console.log('[register-student] Creating auth user with email:', email);

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
      console.error('[register-student] Failed to create auth user:', createAuthError);
      throw new Error(`Failed to create auth user: ${createAuthError?.message}`);
    }

    console.log('[register-student] Auth user created:', newUser.user.id);

    // Insert into global_users table
    console.log('[register-student] Inserting into global_users:', {
      login,
      surname,
      name,
      phone_number,
      has_telegram_id: !!telegram_id,
    });

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
      console.error('[register-student] Failed to insert into global_users:', insertError);
      // Rollback: delete auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        console.log('[register-student] Rolled back auth user');
      } catch (rollbackError) {
        console.error('[register-student] Rollback failed:', rollbackError);
      }
      throw new Error(`Failed to create user record: ${insertError.message}`);
    }

    console.log('[register-student] Successfully created user:', login);
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
    console.error('[register-student] Error:', error);
    console.error('[register-student] Error stack:', (error as Error).stack);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

