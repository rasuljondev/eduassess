-- EduAssess: Drop Legacy Architecture Objects (Old Temporary Student System)
-- Run AFTER you confirm db_legacy_audit.sql output.
-- Safe: uses IF EXISTS everywhere.
-- ⚠️ Destructive: removes legacy tables/views/functions/policies and old analytics views.

begin;

-- 1) Drop legacy RLS policies that reference old tables (safe even if tables already dropped)
-- IMPORTANT:
-- Postgres requires the table to exist for "DROP POLICY ... ON table".
-- So we guard policy drops with to_regclass() checks.
do $$
begin
  if to_regclass('public.generated_students') is not null then
    execute 'drop policy if exists "gen_students_read" on public.generated_students';
    execute 'drop policy if exists "gen_students_no_client_insert" on public.generated_students';
    execute 'drop policy if exists "gen_students_no_client_update" on public.generated_students';
    execute 'drop policy if exists "gen_students_no_client_delete" on public.generated_students';
    execute 'drop policy if exists "gen_students_self_read" on public.generated_students';
  end if;

  if to_regclass('public.student_access') is not null then
    execute 'drop policy if exists "student_access_self_read" on public.student_access';
    execute 'drop policy if exists "student_access_no_client_insert" on public.student_access';
    execute 'drop policy if exists "student_access_no_client_update" on public.student_access';
    execute 'drop policy if exists "student_access_no_client_delete" on public.student_access';
  end if;
end $$;

-- apply_test_schema.sql legacy policies
drop policy if exists "tests_student_read" on public.tests;
drop policy if exists "questions_student_read" on public.questions;
do $$
begin
  if to_regclass('public.telegram_connections') is not null then
    execute 'drop policy if exists "telegram_connections_service_role" on public.telegram_connections';
    execute 'drop policy if exists "telegram_connections_self_read" on public.telegram_connections';
  end if;
end $$;

-- 2) Drop legacy triggers
do $$
begin
  if to_regclass('public.generated_students') is not null then
    execute 'drop trigger if exists trg_generated_student_created on public.generated_students';
    execute 'drop trigger if exists trg_backup_student_info on public.generated_students';
  end if;
end $$;
drop trigger if exists trg_submission_created on public.submissions;

-- 3) Drop legacy functions
drop function if exists public.on_generated_student_created() cascade;
drop function if exists public.backup_student_info_to_submissions() cascade;
drop function if exists public.cleanup_expired_test_takers() cascade;
drop function if exists public.on_submission_created() cascade;

-- 4) Drop legacy views (generation analytics)
drop view if exists public.center_generation_stats cascade;
drop view if exists public.center_generation_daily_last7 cascade;
drop view if exists public.testname_generation_daily_last7 cascade;
drop view if exists public.testname_generation_stats cascade;
drop view if exists public.generation_activity_recent cascade;

-- Additional legacy analytics views referenced by old SupabaseAnalyticsService
drop view if exists public.center_taken_stats cascade;
drop view if exists public.center_expired_stats cascade;
drop view if exists public.center_taken_daily_last7 cascade;
drop view if exists public.center_expired_daily_last7 cascade;
drop view if exists public.testname_taken_stats cascade;
drop view if exists public.testname_expired_stats cascade;
drop view if exists public.testname_taken_daily_last7 cascade;
drop view if exists public.testname_expired_daily_last7 cascade;

-- 5) Drop legacy tables
drop table if exists public.student_access cascade;
drop table if exists public.generation_events cascade;
drop table if exists public.generated_students cascade;
drop table if exists public.student_usage_events cascade;

-- Telegram connections table (legacy mapping login -> chat_id; old bot only)
drop table if exists public.telegram_connections cascade;

-- 6) Optional: remove legacy columns (only if you don't need legacy history)
-- If you already purged student data, this is safe and helps fully remove old architecture remnants.
-- Uncomment to fully remove legacy column.
-- alter table public.submissions drop column if exists generated_student_id;

commit;


