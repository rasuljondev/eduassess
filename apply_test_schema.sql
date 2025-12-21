-- =========================================================
-- TEST & QUESTION MANAGEMENT SYSTEM - APPLY THIS TO YOUR DATABASE
-- Run this in your Supabase SQL Editor
-- =========================================================

-- Tests table
create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  name text not null,
  exam_type public.exam_type not null,
  description text,
  duration_minutes int not null default 120,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tests_center on public.tests(center_id);
create index if not exists idx_tests_exam_type on public.tests(exam_type);

-- Questions table
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  question_text text not null,
  expected_answer text not null,
  order_num int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_questions_test on public.questions(test_id, order_num);

-- Telegram bot connections (for future use)
create table if not exists public.telegram_connections (
  login text primary key,
  telegram_chat_id bigint not null,
  connected_at timestamptz not null default now()
);

-- Update submissions table with grading fields
alter table public.submissions 
add column if not exists phone_number text,
add column if not exists test_id uuid references public.tests(id),
add column if not exists is_graded boolean not null default false,
add column if not exists graded_at timestamptz,
add column if not exists graded_by uuid references auth.users(id);

-- RLS policies for tests
alter table public.tests enable row level security;

drop policy if exists "tests_center_admin_all" on public.tests;
create policy "tests_center_admin_all"
on public.tests for all
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.center_id = tests.center_id
    and p.role = 'center_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.center_id = tests.center_id
    and p.role = 'center_admin'
  )
);

drop policy if exists "tests_superadmin_read" on public.tests;
create policy "tests_superadmin_read"
on public.tests for select
using (public.is_superadmin());

-- Students can read tests for their assigned exam type
drop policy if exists "tests_student_read" on public.tests;
create policy "tests_student_read"
on public.tests for select
using (
  exists (
    select 1 from public.student_access sa
    where sa.auth_user_id = auth.uid()
    and sa.exam = tests.exam_type
    and sa.center_id = tests.center_id
    and sa.expires_at > now()
  )
);

-- RLS policies for questions
alter table public.questions enable row level security;

drop policy if exists "questions_via_test_access" on public.questions;
create policy "questions_via_test_access"
on public.questions for all
using (
  exists (
    select 1 from public.tests t
    join public.profiles p on p.center_id = t.center_id
    where t.id = questions.test_id
    and p.user_id = auth.uid()
    and p.role = 'center_admin'
  )
)
with check (
  exists (
    select 1 from public.tests t
    join public.profiles p on p.center_id = t.center_id
    where t.id = questions.test_id
    and p.user_id = auth.uid()
    and p.role = 'center_admin'
  )
);

drop policy if exists "questions_student_read" on public.questions;
create policy "questions_student_read"
on public.questions for select
using (
  exists (
    select 1 from public.student_access sa
    join public.tests t on t.exam_type = sa.exam
    where sa.auth_user_id = auth.uid()
    and questions.test_id = t.id
    and sa.expires_at > now()
  )
);

-- RLS policies for generated_students (students need to read their own record for submission verification)
-- Add policy for students to read their own generated_students record
drop policy if exists "gen_students_self_read" on public.generated_students;
create policy "gen_students_self_read"
on public.generated_students for select
using (auth_user_id = auth.uid());

-- RLS policies for submissions
alter table public.submissions enable row level security;

-- Drop ALL old submission policies first (from original migration and new ones)
drop policy if exists "submissions_student_insert_active" on public.submissions;
drop policy if exists "submissions_no_student_update" on public.submissions;
drop policy if exists "submissions_no_student_delete" on public.submissions;
drop policy if exists "submissions_student_insert" on public.submissions;
drop policy if exists "submissions_student_read" on public.submissions;
drop policy if exists "submissions_center_admin_read" on public.submissions;
drop policy if exists "submissions_center_admin_update" on public.submissions;
drop policy if exists "submissions_superadmin_read" on public.submissions;

-- Students can insert their own submissions
create policy "submissions_student_insert"
on public.submissions for insert
with check (
  exists (
    select 1 from public.generated_students gs
    where gs.auth_user_id = auth.uid()
    and gs.id = generated_student_id
  )
);

-- Students can read their own submissions
create policy "submissions_student_read"
on public.submissions for select
using (
  exists (
    select 1 from public.generated_students gs
    where gs.auth_user_id = auth.uid()
    and gs.id = generated_student_id
  )
);

-- Center admins can view submissions for their center
create policy "submissions_center_admin_read"
on public.submissions for select
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.center_id = submissions.center_id
    and p.role = 'center_admin'
  )
);

-- Center admins can update grading status for their center's submissions
create policy "submissions_center_admin_update"
on public.submissions for update
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.center_id = submissions.center_id
    and p.role = 'center_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.center_id = submissions.center_id
    and p.role = 'center_admin'
  )
);

-- Super admins can read all submissions
create policy "submissions_superadmin_read"
on public.submissions for select
using (public.is_superadmin());

-- =========================================================
-- FIX: submission trigger must bypass RLS on student_usage_events
-- In mig.sql, student_usage_events blocks all client writes via RLS.
-- The submission trigger writes to student_usage_events, so we must run it
-- as SECURITY DEFINER (table owner) to bypass RLS.
-- =========================================================

create or replace function public.on_submission_created()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- RLS policies for scores (if not already enabled)
alter table public.scores enable row level security;

-- Drop existing policies if any
drop policy if exists "scores_center_admin_manage" on public.scores;
drop policy if exists "scores_student_read_published" on public.scores;
drop policy if exists "scores_superadmin_read" on public.scores;

-- Center admins can manage scores for their center
create policy "scores_center_admin_manage"
on public.scores for all
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.center_id = scores.center_id
    and p.role = 'center_admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.center_id = scores.center_id
    and p.role = 'center_admin'
  )
);

-- Students can read their own published scores via login
-- This will be used by Telegram bot
create policy "scores_student_read_published"
on public.scores for select
using (
  is_published = true
  and exists (
    select 1 from public.submissions s
    join public.generated_students gs on gs.id = s.generated_student_id
    where s.id = scores.submission_id
    and gs.login = (select login from public.generated_students where auth_user_id = auth.uid() limit 1)
  )
);

-- Super admins can read all scores
create policy "scores_superadmin_read"
on public.scores for select
using (public.is_superadmin());

-- RLS policies for telegram_connections
alter table public.telegram_connections enable row level security;

-- Allow service role (bot) to manage connections
-- Note: Bot uses service role key, so RLS is bypassed, but we add policy for completeness
drop policy if exists "telegram_connections_service_role" on public.telegram_connections;
create policy "telegram_connections_service_role"
on public.telegram_connections for all
using (true)
with check (true);

-- Students can read their own connection
drop policy if exists "telegram_connections_self_read" on public.telegram_connections;
create policy "telegram_connections_self_read"
on public.telegram_connections for select
using (
  login = (select login from public.generated_students where auth_user_id = auth.uid() limit 1)
);

-- Success message
select 'Test & Question Management schema applied successfully!' as status;

