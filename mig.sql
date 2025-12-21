-- =========================================================
-- EXAM.UZ MULTI-TENANT EXAM PLATFORM (Supabase)
-- FULL SETUP SCRIPT: schema + triggers + RLS + policies
-- =========================================================

-- 0) Extensions
create extension if not exists "pgcrypto";

-- 1) Enums
do $$ begin
  create type public.role_type as enum ('superadmin', 'center_admin', 'student');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.exam_type as enum ('ielts','sat','aptis','multi_level');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.student_status as enum ('unused','in_progress','submitted','expired');
exception when duplicate_object then null;
end $$;

-- 2) Core tables

-- 2.1 Centers
create table if not exists public.centers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_path text,
  created_at timestamptz not null default now()
);

-- 2.2 Profiles (maps auth.users -> role + optional center)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.role_type not null,
  center_id uuid references public.centers(id),
  full_name text,
  created_at timestamptz not null default now()
);
create index if not exists idx_profiles_center on public.profiles(center_id);

-- 2.3 Generated student credentials (one test binding)
create table if not exists public.generated_students (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  exam public.exam_type not null,
  login text not null unique,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  status public.student_status not null default 'unused',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_gen_students_center on public.generated_students(center_id);
create index if not exists idx_gen_students_created_at on public.generated_students(created_at);

-- 2.4 Student access window (6 hours) - ENFORCEMENT TABLE
create table if not exists public.student_access (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  generated_student_id uuid not null references public.generated_students(id) on delete cascade,
  center_id uuid not null references public.centers(id) on delete cascade,
  exam public.exam_type not null,
  started_at timestamptz not null,
  expires_at timestamptz not null
);
create index if not exists idx_access_expires on public.student_access(expires_at);

-- 2.5 Submissions (raw answers only)
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  generated_student_id uuid not null references public.generated_students(id) on delete cascade,
  center_id uuid not null references public.centers(id) on delete cascade,
  exam public.exam_type not null,
  student_full_name text not null,
  answers jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_sub_center on public.submissions(center_id);
create index if not exists idx_sub_created_at on public.submissions(created_at);

-- 2.6 Scores (hybrid scoring; published later)
create table if not exists public.scores (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  center_id uuid not null references public.centers(id) on delete cascade,
  exam public.exam_type not null,
  auto_score jsonb,
  manual_score jsonb,
  final_score jsonb,
  is_published boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_scores_center on public.scores(center_id);

-- 2.7 Generation events (analytics: generated today/total)
create table if not exists public.generation_events (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  generated_student_id uuid not null references public.generated_students(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_gen_events_center_created on public.generation_events(center_id, created_at);

-- 2.8 Notifications (superadmin inbox)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- 'student_generated' etc
  payload jsonb not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_recipient on public.notifications(recipient_user_id, created_at);

-- 3) Helper functions

-- 3.1 is_superadmin()
create or replace function public.is_superadmin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'superadmin'
  );
$$;

-- 3.2 Trigger: on generated_students insert -> generation_events + notify superadmins
create or replace function public.on_generated_student_created()
returns trigger
language plpgsql
as $$
declare
  sa record;
begin
  insert into public.generation_events(center_id, generated_student_id)
  values (new.center_id, new.id);

  for sa in
    select user_id from public.profiles where role = 'superadmin'
  loop
    insert into public.notifications(recipient_user_id, type, payload)
    values (
      sa.user_id,
      'student_generated',
      jsonb_build_object(
        'center_id', new.center_id,
        'generated_student_id', new.id,
        'login', new.login,
        'exam', new.exam,
        'created_at', new.created_at
      )
    );
  end loop;

  return new;
end $$;

drop trigger if exists trg_generated_student_created on public.generated_students;
create trigger trg_generated_student_created
after insert on public.generated_students
for each row execute function public.on_generated_student_created();

-- 4) RLS: Enable
alter table public.centers enable row level security;
alter table public.profiles enable row level security;
alter table public.generated_students enable row level security;
alter table public.student_access enable row level security;
alter table public.submissions enable row level security;
alter table public.scores enable row level security;
alter table public.notifications enable row level security;
alter table public.generation_events enable row level security;

-- 5) RLS: Policies (drop first to allow reruns)

-- 5.1 centers: public read (for branding pages /:centerSlug/:testType)
drop policy if exists "centers_public_read" on public.centers;
create policy "centers_public_read"
on public.centers for select
using (true);

-- Optional: only superadmin can insert/update/delete centers
drop policy if exists "centers_superadmin_write" on public.centers;
create policy "centers_superadmin_write"
on public.centers for all
using (public.is_superadmin())
with check (public.is_superadmin());

-- 5.2 profiles: self read OR superadmin read
drop policy if exists "profiles_self_or_superadmin_read" on public.profiles;
create policy "profiles_self_or_superadmin_read"
on public.profiles for select
using (user_id = auth.uid() or public.is_superadmin());

-- Optional: superadmin manages profiles
drop policy if exists "profiles_superadmin_write" on public.profiles;
create policy "profiles_superadmin_write"
on public.profiles for all
using (public.is_superadmin())
with check (public.is_superadmin());

-- 5.3 generated_students: center_admin reads own center; superadmin reads all
drop policy if exists "gen_students_read" on public.generated_students;
create policy "gen_students_read"
on public.generated_students for select
using (
  public.is_superadmin()
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'center_admin'
      and p.center_id = generated_students.center_id
  )
);

-- NOTE: Do NOT allow direct insert from client.
-- Inserts should be via Edge Function using service role.
drop policy if exists "gen_students_no_client_insert" on public.generated_students;
create policy "gen_students_no_client_insert"
on public.generated_students for insert
with check (false);

drop policy if exists "gen_students_no_client_update" on public.generated_students;
create policy "gen_students_no_client_update"
on public.generated_students for update
using (false);

drop policy if exists "gen_students_no_client_delete" on public.generated_students;
create policy "gen_students_no_client_delete"
on public.generated_students for delete
using (false);

-- 5.4 student_access: student can read own record
drop policy if exists "student_access_self_read" on public.student_access;
create policy "student_access_self_read"
on public.student_access for select
using (auth_user_id = auth.uid());

-- no direct client writes (use Edge Function)
drop policy if exists "student_access_no_client_insert" on public.student_access;
create policy "student_access_no_client_insert"
on public.student_access for insert
with check (false);

drop policy if exists "student_access_no_client_update" on public.student_access;
create policy "student_access_no_client_update"
on public.student_access for update
using (false);

drop policy if exists "student_access_no_client_delete" on public.student_access;
create policy "student_access_no_client_delete"
on public.student_access for delete
using (false);

-- 5.5 submissions:
-- Center admin + superadmin can read submissions for their center
drop policy if exists "submissions_center_admin_read" on public.submissions;
create policy "submissions_center_admin_read"
on public.submissions for select
using (
  public.is_superadmin()
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'center_admin'
      and p.center_id = submissions.center_id
  )
);

-- Student can insert submission only if access exists and not expired
drop policy if exists "submissions_student_insert_active" on public.submissions;
create policy "submissions_student_insert_active"
on public.submissions for insert
with check (
  exists (
    select 1
    from public.student_access a
    where a.auth_user_id = auth.uid()
      and a.center_id = submissions.center_id
      and a.exam = submissions.exam
      and a.expires_at > now()
  )
);

-- Students cannot update/delete submissions
drop policy if exists "submissions_no_student_update" on public.submissions;
create policy "submissions_no_student_update"
on public.submissions for update
using (false);

drop policy if exists "submissions_no_student_delete" on public.submissions;
create policy "submissions_no_student_delete"
on public.submissions for delete
using (false);

-- 5.6 scores: center admin can manage within own center; superadmin can manage all
drop policy if exists "scores_center_admin_manage" on public.scores;
create policy "scores_center_admin_manage"
on public.scores for all
using (
  public.is_superadmin()
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'center_admin'
      and p.center_id = scores.center_id
  )
)
with check (
  public.is_superadmin()
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'center_admin'
      and p.center_id = scores.center_id
  )
);

-- 5.7 notifications: only recipient can read/update
drop policy if exists "notifications_recipient_read" on public.notifications;
create policy "notifications_recipient_read"
on public.notifications for select
using (recipient_user_id = auth.uid());

drop policy if exists "notifications_recipient_update" on public.notifications;
create policy "notifications_recipient_update"
on public.notifications for update
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

-- no client insert/delete notifications
drop policy if exists "notifications_no_client_insert" on public.notifications;
create policy "notifications_no_client_insert"
on public.notifications for insert
with check (false);

drop policy if exists "notifications_no_client_delete" on public.notifications;
create policy "notifications_no_client_delete"
on public.notifications for delete
using (false);

-- 5.8 generation_events: superadmin reads all (analytics)
drop policy if exists "gen_events_superadmin_read" on public.generation_events;
create policy "gen_events_superadmin_read"
on public.generation_events for select
using (public.is_superadmin());

-- no client insert/update/delete generation_events
drop policy if exists "gen_events_no_client_write" on public.generation_events;
create policy "gen_events_no_client_write"
on public.generation_events for all
using (false)
with check (false);

-- 6) Analytics view (for convenience)
create or replace view public.center_generation_stats as
select
  c.id as center_id,
  c.slug,
  c.name,
  count(*) filter (where ge.created_at >= date_trunc('day', now())) as generated_today,
  count(*) as generated_total
from public.centers c
left join public.generation_events ge on ge.center_id = c.id
group by c.id, c.slug, c.name;

-- Note: View access depends on underlying RLS.
-- Centers is public-read; generation_events is superadmin-read,
-- so only superadmin will see real counts from the join.

-- =========================================================
-- END
-- =========================================================
-- FIX FOR RLS RECURSION ISSUE
-- Run this in your Supabase SQL editor to fix the recursive RLS policy

-- Make is_superadmin() use security definer to bypass RLS
-- This prevents infinite recursion when RLS policies call this function
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER  -- This bypasses RLS when checking, preventing recursion
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'superadmin'
  );
$$;

-- After running this, the profiles RLS policy should work without recursion
-- because is_superadmin() will use security definer and won't trigger RLS checks
-- when it queries the profiles table internally

-- Storage Bucket RLS Policies for center-logos
-- Run this in your Supabase SQL Editor

-- First, ensure the bucket exists and is public
-- You can create it via Dashboard: Storage > Create bucket > "center-logos" (public = true)

-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to center-logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'center-logos'
);

-- Policy 2: Allow authenticated users to read files (for public bucket, this might not be needed)
CREATE POLICY "Allow authenticated reads from center-logos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'center-logos'
);

-- Policy 3: Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates to center-logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'center-logos'
)
WITH CHECK (
  bucket_id = 'center-logos'
);

-- Policy 4: Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes from center-logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'center-logos'
);

-- Alternative: If you want only superadmins to upload (more secure)
-- Uncomment these and comment out the above policies:

-- CREATE POLICY "Allow superadmin uploads to center-logos"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'center-logos' 
--   AND public.is_superadmin()
-- );

-- CREATE POLICY "Allow public reads from center-logos"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (
--   bucket_id = 'center-logos'
-- );

-- CREATE POLICY "Allow superadmin updates to center-logos"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'center-logos' 
--   AND public.is_superadmin()
-- )
-- WITH CHECK (
--   bucket_id = 'center-logos' 
--   AND public.is_superadmin()
-- );

-- CREATE POLICY "Allow superadmin deletes from center-logos"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'center-logos' 
--   AND public.is_superadmin()
-- );

-- =========================================================
-- USAGE EVENTS (taken / expired) FOR ANALYTICS
-- Adds durable event records so analytics can show:
-- - total generated (from generation_events)
-- - total taken (from taken events)
-- - total not used (from expired events)
-- and their daily histories (last 7 days).
-- =========================================================

-- 1) Event type
do $$ begin
  create type public.usage_event_type as enum ('login','taken','expired');
exception when duplicate_object then null;
end $$;

-- 2) Usage events table (durable)
create table if not exists public.student_usage_events (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  generated_student_id uuid references public.generated_students(id) on delete set null,
  exam public.exam_type,
  test_name text,
  event_type public.usage_event_type not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_usage_events_center_created on public.student_usage_events(center_id, created_at);
create index if not exists idx_usage_events_type_created on public.student_usage_events(event_type, created_at);
create index if not exists idx_usage_events_test_name on public.student_usage_events(test_name);

-- 3) Trigger: on submission insert => create TAKEN event + mark generated_student submitted
create or replace function public.on_submission_created()
returns trigger
language plpgsql
as $$
declare
  gs record;
begin
  -- Try to fetch generated student details (may be null if already deleted)
  select center_id, exam, test_name
  into gs
  from public.generated_students
  where id = new.generated_student_id;

  insert into public.student_usage_events(center_id, generated_student_id, exam, test_name, event_type, created_at)
  values (
    coalesce(gs.center_id, new.center_id),
    new.generated_student_id,
    coalesce(gs.exam, new.exam),
    coalesce(gs.test_name, null),
    'taken',
    new.created_at
  );

  -- Mark student as submitted (if record still exists)
  update public.generated_students
  set status = 'submitted'
  where id = new.generated_student_id;

  return new;
end $$;

drop trigger if exists trg_submission_created on public.submissions;
create trigger trg_submission_created
after insert on public.submissions
for each row execute function public.on_submission_created();

-- 4) Replace cleanup function to MARK expired + emit EXPIRED events (do not delete generated_students)
-- Edge Function will still delete auth users using returned auth_user_ids.
create or replace function public.cleanup_expired_test_takers()
returns jsonb
language plpgsql
security definer
as $$
declare
  expired_record record;
  deleted_count int := 0;
  deleted_logins text[] := array[]::text[];
  auth_user_ids uuid[] := array[]::uuid[];
begin
  for expired_record in
    select id, login, auth_user_id, center_id, exam, test_name
    from public.generated_students
    where created_at < now() - interval '6 hours'
      and status != 'submitted'
      and status != 'expired'
      and auth_user_id is not null
  loop
    auth_user_ids := array_append(auth_user_ids, expired_record.auth_user_id);
    deleted_logins := array_append(deleted_logins, expired_record.login);
    deleted_count := deleted_count + 1;

    -- Emit expired event
    insert into public.student_usage_events(center_id, generated_student_id, exam, test_name, event_type, created_at)
    values (expired_record.center_id, expired_record.id, expired_record.exam, expired_record.test_name, 'expired', now());

    -- Mark as expired and detach auth user
    update public.generated_students
    set status = 'expired', auth_user_id = null
    where id = expired_record.id;
  end loop;

  return jsonb_build_object(
    'deleted_count', deleted_count,
    'deleted_logins', deleted_logins,
    'auth_user_ids', auth_user_ids
  );
end $$;

grant execute on function public.cleanup_expired_test_takers() to authenticated;

-- 5) RLS: allow superadmin read of usage events (analytics)
alter table public.student_usage_events enable row level security;

drop policy if exists "usage_events_superadmin_read" on public.student_usage_events;
create policy "usage_events_superadmin_read"
on public.student_usage_events for select
using (public.is_superadmin());

-- No client insert/update/delete
drop policy if exists "usage_events_no_client_write" on public.student_usage_events;
create policy "usage_events_no_client_write"
on public.student_usage_events for all
using (false)
with check (false);

-- =========================================================
-- END
-- =========================================================

-- =========================================================
-- GENERATED USER DISPLAY PASSWORD (admin-only)
-- Adds a column so center admins can see/copy generated passwords.
-- NOTE: Students do NOT have select access to generated_students by current RLS.
-- =========================================================

alter table public.generated_students
  add column if not exists plain_password text;


-- =========================================================
-- CLEANUP EXPIRED TEST TAKERS (6 hours after creation)
-- This function deletes expired users but preserves submissions
-- =========================================================

-- Step 1: Change submissions FK to preserve data when student is deleted
-- We'll change from CASCADE to SET NULL, but first we need to backup the student info

-- Add test_name column to generated_students (if not exists)
alter table public.generated_students
  add column if not exists test_name text;

-- Add columns to submissions to preserve student info (before deletion)
alter table public.submissions 
  add column if not exists student_login text,
  add column if not exists student_exam public.exam_type,
  add column if not exists student_test_name text,
  add column if not exists student_created_at timestamptz;

-- Make generated_student_id nullable (so we can set it to NULL when student is deleted)
alter table public.submissions
  alter column generated_student_id drop not null;

-- Step 2: Function to backup student info to submissions before deletion
create or replace function public.backup_student_info_to_submissions()
returns trigger
language plpgsql
as $$
begin
  -- Before deleting generated_student, copy info to submissions
  update public.submissions
  set 
    student_login = old.login,
    student_exam = old.exam,
    student_test_name = old.test_name,
    student_created_at = old.created_at
  where generated_student_id = old.id;
  
  return old;
end $$;

-- Step 3: Trigger before delete on generated_students
drop trigger if exists trg_backup_student_info on public.generated_students;
create trigger trg_backup_student_info
before delete on public.generated_students
for each row execute function public.backup_student_info_to_submissions();

-- Step 4: Change FK constraint to SET NULL (preserve submissions)
-- First, drop the old constraint
alter table public.submissions
  drop constraint if exists submissions_generated_student_id_fkey;

-- Add new constraint with SET NULL
alter table public.submissions
  add constraint submissions_generated_student_id_fkey
  foreign key (generated_student_id)
  references public.generated_students(id)
  on delete set null;

-- Step 5: Function to clean up expired users (6 hours after creation)
-- This should be called by Edge Function with service role key
create or replace function public.cleanup_expired_test_takers()
returns jsonb
language plpgsql
security definer
as $$
declare
  expired_record record;
  deleted_count int := 0;
  deleted_logins text[] := array[]::text[];
  auth_user_ids uuid[] := array[]::uuid[];
begin
  -- Find expired generated_students (created more than 6 hours ago, not submitted)
  for expired_record in
    select id, login, auth_user_id
    from public.generated_students
    where created_at < now() - interval '6 hours'
      and status != 'submitted'
      and auth_user_id is not null
  loop
    -- Collect IDs for deletion
    auth_user_ids := array_append(auth_user_ids, expired_record.auth_user_id);
    deleted_logins := array_append(deleted_logins, expired_record.login);
    deleted_count := deleted_count + 1;
    
    -- Delete generated_student (trigger will backup info to submissions first)
    delete from public.generated_students
    where id = expired_record.id;
  end loop;
  
  -- Return result (auth users will be deleted by Edge Function using admin API)
  return jsonb_build_object(
    'deleted_count', deleted_count,
    'deleted_logins', deleted_logins,
    'auth_user_ids', auth_user_ids
  );
end $$;

-- Grant execute permission
grant execute on function public.cleanup_expired_test_takers() to authenticated;

-- Note: To run this automatically:
-- 1. Use Supabase Edge Function with cron trigger (recommended) - see supabase/functions/cleanup-expired-users/
-- 2. The Edge Function will call this DB function, then delete auth users via admin API
-- 3. Alternatively, use pg_cron extension (if available in your Supabase plan)



-- =========================================================
-- ANALYTICS EXTENSIONS (centers + tests + last 7 days)
-- Requires base schema from mig.sql
-- =========================================================

-- 1) Add test_name to generated_students (needed for "Top Test" analytics)
alter table public.generated_students
  add column if not exists test_name text;

create index if not exists idx_gen_students_test_name on public.generated_students(test_name);

-- 2) Center daily generation for last 7 days (based on generation_events)
create or replace view public.center_generation_daily_last7 as
select
  c.id as center_id,
  c.slug as center_slug,
  c.name as center_name,
  date_trunc('day', ge.created_at)::date as day,
  count(*)::int as generated_count
from public.generation_events ge
join public.centers c on c.id = ge.center_id
where ge.created_at >= (now() - interval '6 days')
group by c.id, c.slug, c.name, date_trunc('day', ge.created_at)::date
order by day asc;

-- 3) Test-name daily generation for last 7 days (join generated_students for test_name)
create or replace view public.testname_generation_daily_last7 as
select
  coalesce(gs.test_name, '(no test name)') as test_name,
  date_trunc('day', ge.created_at)::date as day,
  count(*)::int as generated_count
from public.generation_events ge
join public.generated_students gs on gs.id = ge.generated_student_id
where ge.created_at >= (now() - interval '6 days')
group by coalesce(gs.test_name, '(no test name)'), date_trunc('day', ge.created_at)::date
order by day asc;

-- 4) Test-name totals + today (for the Top Test card)
create or replace view public.testname_generation_stats as
select
  coalesce(gs.test_name, '(no test name)') as test_name,
  count(*) filter (where ge.created_at >= date_trunc('day', now()))::int as generated_today,
  count(*)::int as generated_total
from public.generation_events ge
join public.generated_students gs on gs.id = ge.generated_student_id
group by coalesce(gs.test_name, '(no test name)');

-- 5) Recent activity (grouped by minute, center, test_name)
create or replace view public.generation_activity_recent as
select
  date_trunc('minute', ge.created_at) as minute_bucket,
  c.slug as center_slug,
  c.name as center_name,
  coalesce(gs.test_name, '(no test name)') as test_name,
  count(*)::int as generated_count
from public.generation_events ge
join public.centers c on c.id = ge.center_id
join public.generated_students gs on gs.id = ge.generated_student_id
where ge.created_at >= (now() - interval '7 days')
group by minute_bucket, c.slug, c.name, coalesce(gs.test_name, '(no test name)')
order by minute_bucket desc;

-- 6) Taken daily generation for last 7 days (submissions)
create or replace view public.center_taken_daily_last7 as
select
  c.id as center_id,
  c.slug as center_slug,
  c.name as center_name,
  date_trunc('day', s.created_at)::date as day,
  count(*)::int as taken_count
from public.submissions s
join public.centers c on c.id = s.center_id
where s.created_at >= (now() - interval '6 days')
group by c.id, c.slug, c.name, date_trunc('day', s.created_at)::date
order by day asc;

-- 7) Expired (not used) daily last 7 days (from student_usage_events)
create or replace view public.center_expired_daily_last7 as
select
  c.id as center_id,
  c.slug as center_slug,
  c.name as center_name,
  date_trunc('day', e.created_at)::date as day,
  count(*)::int as expired_count
from public.student_usage_events e
join public.centers c on c.id = e.center_id
where e.event_type = 'expired'
  and e.created_at >= (now() - interval '6 days')
group by c.id, c.slug, c.name, date_trunc('day', e.created_at)::date
order by day asc;

-- 8) Test-name taken daily last 7 days
create or replace view public.testname_taken_daily_last7 as
select
  coalesce(e.test_name, '(no test name)') as test_name,
  date_trunc('day', e.created_at)::date as day,
  count(*)::int as taken_count
from public.student_usage_events e
where e.event_type = 'taken'
  and e.created_at >= (now() - interval '6 days')
group by coalesce(e.test_name, '(no test name)'), date_trunc('day', e.created_at)::date
order by day asc;

-- 9) Test-name expired daily last 7 days
create or replace view public.testname_expired_daily_last7 as
select
  coalesce(e.test_name, '(no test name)') as test_name,
  date_trunc('day', e.created_at)::date as day,
  count(*)::int as expired_count
from public.student_usage_events e
where e.event_type = 'expired'
  and e.created_at >= (now() - interval '6 days')
group by coalesce(e.test_name, '(no test name)'), date_trunc('day', e.created_at)::date
order by day asc;

-- 10) Center taken/expired totals and today
create or replace view public.center_taken_stats as
select
  c.id as center_id,
  c.slug,
  c.name,
  count(*) filter (where e.event_type = 'taken' and e.created_at >= date_trunc('day', now()))::int as taken_today,
  count(*) filter (where e.event_type = 'taken')::int as taken_total
from public.centers c
left join public.student_usage_events e on e.center_id = c.id
group by c.id, c.slug, c.name;

create or replace view public.center_expired_stats as
select
  c.id as center_id,
  c.slug,
  c.name,
  count(*) filter (where e.event_type = 'expired' and e.created_at >= date_trunc('day', now()))::int as expired_today,
  count(*) filter (where e.event_type = 'expired')::int as expired_total
from public.centers c
left join public.student_usage_events e on e.center_id = c.id
group by c.id, c.slug, c.name;

-- 11) Test-name taken/expired totals and today
create or replace view public.testname_taken_stats as
select
  coalesce(e.test_name, '(no test name)') as test_name,
  count(*) filter (where e.event_type = 'taken' and e.created_at >= date_trunc('day', now()))::int as taken_today,
  count(*) filter (where e.event_type = 'taken')::int as taken_total
from public.student_usage_events e
group by coalesce(e.test_name, '(no test name)');

create or replace view public.testname_expired_stats as
select
  coalesce(e.test_name, '(no test name)') as test_name,
  count(*) filter (where e.event_type = 'expired' and e.created_at >= date_trunc('day', now()))::int as expired_today,
  count(*) filter (where e.event_type = 'expired')::int as expired_total
from public.student_usage_events e
group by coalesce(e.test_name, '(no test name)');

-- =========================================================
-- END
-- =========================================================


-- =========================================================
-- FIX: DELETE CENTER CASCADE + CLEANUP ENFORCEMENT
-- =========================================================

-- 1. Fix Profiles table to allow Center deletion
alter table public.profiles 
  drop constraint if exists profiles_center_id_fkey;

alter table public.profiles
  add constraint profiles_center_id_fkey 
  foreign key (center_id) 
  references public.centers(id) 
  on delete cascade;

-- 2. Ensure Submissions survive Student deletion
-- (Backup info trigger is already in your mig.sql, but let's ensure FK is correct)
alter table public.submissions
  drop constraint if exists submissions_generated_student_id_fkey;

alter table public.submissions
  add constraint submissions_generated_student_id_fkey
  foreign key (generated_student_id)
  references public.generated_students(id)
  on delete set null;

-- 3. Fix Generation Events to cascade delete with center
alter table public.generation_events
  drop constraint if exists generation_events_center_id_fkey;

alter table public.generation_events
  add constraint generation_events_center_id_fkey
  foreign key (center_id)
  references public.centers(id)
  on delete cascade;

-- 4. Final Cleanup Function (Enforce deletion of records)
-- This function will be called by your Edge Function every hour.
create or replace function public.cleanup_expired_test_takers()
returns jsonb
language plpgsql
security definer
as $$
declare
  expired_record record;
  deleted_count int := 0;
  deleted_logins text[] := array[]::text[];
  auth_user_ids uuid[] := array[]::uuid[];
begin
  -- Find students created > 6 hours ago who haven't submitted
  for expired_record in
    select id, login, auth_user_id
    from public.generated_students
    where created_at < now() - interval '6 hours'
      and status != 'submitted'
      and auth_user_id is not null
  loop
    -- Collect Auth IDs so Edge Function can delete them from Supabase Auth
    auth_user_ids := array_append(auth_user_ids, expired_record.auth_user_id);
    deleted_logins := array_append(deleted_logins, expired_record.login);
    deleted_count := deleted_count + 1;
    
    -- DELETE the student (The trigger 'trg_backup_student_info' 
    -- in your mig.sql will save their data to the submission table first)
    delete from public.generated_students
    where id = expired_record.id;
  end loop;
  
  return jsonb_build_object(
    'deleted_count', deleted_count,
    'deleted_logins', deleted_logins,
    'auth_user_ids', auth_user_ids
  );
end $$;
