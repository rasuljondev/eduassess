-- EduAssess: Legacy Architecture Audit
-- Run in Supabase Dashboard -> SQL Editor to see what old objects still exist.

-- 1) Legacy tables
select n.nspname as schema, c.relname as name, c.relkind as kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'generated_students',
    'student_access',
    'generation_events',
    'telegram_connections'
  )
order by 1,2;

-- 2) Legacy views (generation analytics)
select schemaname as schema, viewname as name
from pg_views
where schemaname = 'public'
  and viewname ilike any (array[
    '%generation%',
    'center_taken_%',
    'center_expired_%',
    'testname_%'
  ])
order by 1,2;

-- 3) Legacy functions
select n.nspname as schema, p.proname as name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname ilike any (array[
    '%generated%',
    '%student_access%',
    '%generation%',
    'cleanup_expired_test_takers',
    'on_generated_student_created',
    'backup_student_info_to_submissions'
  ])
order by 1,2;

-- 4) Legacy triggers (common names)
select event_object_schema as schema, event_object_table as table_name, trigger_name
from information_schema.triggers
where event_object_schema = 'public'
  and trigger_name ilike any (array[
    '%generated%',
    '%student%',
    '%backup%',
    '%cleanup%'
  ])
order by 1,2,3;


