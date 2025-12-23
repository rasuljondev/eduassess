-- EduAssess: Purge all student/user data while keeping:
--   - Education centers (public.centers)
--   - Admin/SuperAdmin profiles (public.profiles)
--   - Auth users that belong to admins/superadmins (auth.users referenced by public.profiles)
--
-- ⚠️ WARNING: This is destructive and irreversible unless you have backups.
-- Run in Supabase Dashboard -> SQL Editor (as project owner).

begin;

-- 1) Delete application-level student data (new architecture)
do $$
begin
  if to_regclass('public.exam_attempts') is not null then
    execute 'delete from public.exam_attempts';
  end if;

  if to_regclass('public.exam_requests') is not null then
    execute 'delete from public.exam_requests';
  end if;

  if to_regclass('public.scores') is not null then
    execute 'delete from public.scores';
  end if;

  if to_regclass('public.submissions') is not null then
    execute 'delete from public.submissions';
  end if;

  if to_regclass('public.telegram_connections') is not null then
    execute 'delete from public.telegram_connections';
  end if;

  if to_regclass('public.notifications') is not null then
    execute 'delete from public.notifications';
  end if;

  if to_regclass('public.global_users') is not null then
    execute 'delete from public.global_users';
  end if;
end $$;

-- 2) Delete legacy student data (old architecture), if still present
do $$
begin
  if to_regclass('public.student_access') is not null then
    execute 'delete from public.student_access';
  end if;

  if to_regclass('public.generation_events') is not null then
    execute 'delete from public.generation_events';
  end if;

  if to_regclass('public.generated_students') is not null then
    execute 'delete from public.generated_students';
  end if;
end $$;

-- 3) Delete all non-admin Auth users (students), keep only those who have profiles rows.
-- This removes student auth accounts created by bot/website.
do $$
begin
  -- Safety check: profiles table must exist, otherwise we might delete everything.
  if to_regclass('public.profiles') is null then
    raise exception 'Safety stop: public.profiles table not found. Aborting purge.';
  end if;

  -- Delete auth users that are NOT referenced by profiles (admins/superadmins).
  delete from auth.users u
  where not exists (
    select 1
    from public.profiles p
    where p.user_id = u.id
  );
end $$;

commit;

-- Optional: verify remaining counts
-- select
--   (select count(*) from public.centers) as centers,
--   (select count(*) from public.profiles) as admin_profiles,
--   (select count(*) from auth.users) as auth_users_remaining;


