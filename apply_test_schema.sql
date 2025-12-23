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

-- Students can read tests only when they have an active approved attempt for that test (new architecture)
drop policy if exists "tests_student_read" on public.tests;
create policy "tests_student_read"
on public.tests for select
using (
  exists (
    select 1
    from public.exam_attempts ea
    join public.global_users gu on gu.id = ea.user_id
    where gu.auth_user_id = auth.uid()
      and ea.test_id = tests.id
      and ea.status in ('ready', 'in_progress')
      and (ea.expires_at is null or ea.expires_at > now())
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
    select 1
    from public.exam_attempts ea
    join public.global_users gu on gu.id = ea.user_id
    where gu.auth_user_id = auth.uid()
      and ea.test_id = questions.test_id
      and ea.status in ('ready', 'in_progress')
      and (ea.expires_at is null or ea.expires_at > now())
  )
);

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
    select 1
    from public.global_users gu
    join public.exam_attempts ea on ea.user_id = gu.id
    where gu.auth_user_id = auth.uid()
      and gu.id = submissions.user_id
      and ea.center_id = submissions.center_id
      and ea.test_id = submissions.test_id
      and ea.status = 'in_progress'
      and (ea.expires_at is null or ea.expires_at > now())
      and ea.submission_id is null
  )
);

-- Students can read their own submissions
create policy "submissions_student_read"
on public.submissions for select
using (
  exists (
    select 1
    from public.global_users gu
    where gu.auth_user_id = auth.uid()
      and gu.id = submissions.user_id
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

-- NOTE: Old architecture used a submission trigger to write into student_usage_events and update generated_students.
-- New architecture does NOT use that trigger. Attempts are updated by app logic.

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
    select 1
    from public.submissions s
    join public.global_users gu on gu.id = s.user_id
    where s.id = scores.submission_id
      and gu.auth_user_id = auth.uid()
  )
);

-- Super admins can read all scores
create policy "scores_superadmin_read"
on public.scores for select
using (public.is_superadmin());

-- NOTE: New architecture stores telegram_id in public.global_users, so telegram_connections is not used.

-- Success message
select 'Test & Question Management schema applied successfully!' as status;

