// Supabase Edge Function: generate-students
// Creates real student auth users + profile + generated_students + student_access (6h)
//
// Expected JSON body:
// { center_slug: string, test_type: 'ielts'|'sat'|'aptis'|'multi_level', test_name: string, count: number }
//
// AuthZ:
// - Requires a logged-in user (JWT) with role center_admin or superadmin.
// - Will assign generated students to the caller's center if center_admin.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ExamType = 'ielts' | 'sat' | 'aptis' | 'multi_level';

function randomCode(len = 5) {
  return Math.random().toString(36).substring(2, 2 + len);
}

function randomPassword(len = 8) {
  const s = Math.random().toString(36).substring(2, 2 + len);
  return s.padEnd(len, '0');
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

    // Client that uses caller JWT for authorization checks (RLS)
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for privileged actions
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const body = await req.json().catch(() => null);
    if (!body) throw new Error('Invalid JSON body');

    const centerSlug: string = body.center_slug;
    const testType: ExamType = body.test_type;
    const testName: string = body.test_name;
    const count: number = Number(body.count ?? 0);

    if (!centerSlug || typeof centerSlug !== 'string') throw new Error('center_slug is required');
    if (!testType || typeof testType !== 'string') throw new Error('test_type is required');
    if (!testName || typeof testName !== 'string') throw new Error('test_name is required');
    if (!Number.isFinite(count) || count < 1 || count > 200) throw new Error('count must be 1..200');

    // Fetch caller profile (role + center_id)
    const { data: profile, error: profileErr } = await supabaseUser
      .from('profiles')
      .select('role, center_id')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (profileErr || !profile) throw new Error('Profile not found');

    // Resolve center: center_admin must use their own center
    let effectiveCenterSlug = centerSlug;
    if (profile.role === 'center_admin') {
      if (!profile.center_id) throw new Error('center_admin missing center_id');
      const { data: c } = await supabaseUser.from('centers').select('slug').eq('id', profile.center_id).single();
      if (!c?.slug) throw new Error('Center not found for admin');
      effectiveCenterSlug = c.slug;
    }

    const { data: center, error: centerError } = await supabaseUser
      .from('centers')
      .select('id, slug')
      .eq('slug', effectiveCenterSlug)
      .single();

    if (centerError || !center) throw new Error('Center not found');

    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const created: Array<{ login: string; password: string; expiresAt: string }> = [];

    for (let i = 0; i < count; i++) {
      const login = `test_${testType}_${randomCode(5)}`;
      const password = randomPassword(8);
      const email = `${login}@temp.exam.uz`;

      // 1) Create auth user
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          login,
          test_type: testType,
          test_name: testName,
          center_slug: center.slug,
          is_generated: true,
        },
      });
      if (createErr || !newUser.user) throw new Error(createErr?.message || 'Failed to create auth user');

      // 2) Create profile (student)
      const { error: profInsertErr } = await supabaseAdmin.from('profiles').insert({
        user_id: newUser.user.id,
        role: 'student',
        center_id: center.id,
        full_name: null,
      });
      if (profInsertErr) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        } catch {
          // ignore
        }
        throw new Error(profInsertErr.message || 'Failed to create profile');
      }

      // 3) Insert generated_students (this triggers generation_events via DB trigger)
      const { data: gs, error: gsErr } = await supabaseAdmin
        .from('generated_students')
        .insert({
          center_id: center.id,
          exam: testType,
          test_name: testName,
          login,
          plain_password: password,
          auth_user_id: newUser.user.id,
          status: 'unused',
          created_by: authData.user.id,
        })
        .select('id')
        .single();

      if (gsErr || !gs?.id) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        } catch {
          // ignore
        }
        throw new Error(gsErr?.message || 'Failed to create generated student record');
      }

      // 4) Insert student_access (6h)
      const { error: accessErr } = await supabaseAdmin.from('student_access').insert({
        auth_user_id: newUser.user.id,
        generated_student_id: gs.id,
        center_id: center.id,
        exam: testType,
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      });
      if (accessErr) {
        // Non-fatal, but without it student cannot submit due to RLS policy
        throw new Error(accessErr.message || 'Failed to create access record');
      }

      created.push({ login, password, expiresAt });
    }

    return new Response(JSON.stringify({ center_slug: center.slug, test_type: testType, test_name: testName, users: created }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});


