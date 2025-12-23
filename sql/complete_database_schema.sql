-- =========================================================
-- EDUASSESS COMPLETE DATABASE SCHEMA
-- Current Full Structure (as of 2024-12-23)
-- =========================================================
-- 
-- This file represents the COMPLETE, CURRENT database structure
-- combining all migrations and updates:
--   - Base architecture (migration_new_architecture.sql)
--   - Test & Question management (apply_test_schema.sql)
--   - Telegram integration (add_telegram_id_to_profiles.sql)
--   - RLS policy fixes (fix_tests_rls_policy.sql)
--
-- ⚠️ IMPORTANT:
--   - This file uses IF NOT EXISTS and DROP IF EXISTS for idempotency
--   - Safe to run multiple times
--   - Will NOT delete existing data
--   - Use this as your single source of truth for the database structure
--
-- Project: exnfvzzoxprgrzgkylnl
-- Dashboard: https://supabase.com/dashboard/project/exnfvzzoxprgrzgkylnl
--
-- To apply: Run this entire file in Supabase SQL Editor
-- =========================================================

BEGIN;

-- =========================================================
-- EXTENSIONS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- ENUMS
-- =========================================================

DO $$ BEGIN
  CREATE TYPE public.role_type AS ENUM ('superadmin', 'center_admin', 'student');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.exam_type AS ENUM ('ielts', 'sat', 'aptis', 'multi_level');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Legacy enums (deprecated but still exist in database for historical compatibility)
DO $$ BEGIN
  CREATE TYPE public.student_status AS ENUM ('unused', 'in_progress', 'submitted', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE public.student_status IS 'Legacy enum - not actively used in new architecture';

DO $$ BEGIN
  CREATE TYPE public.usage_event_type AS ENUM ('taken', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE public.usage_event_type IS 'Legacy enum - not actively used in new architecture';

-- =========================================================
-- CORE TABLES
-- =========================================================

-- Centers
CREATE TABLE IF NOT EXISTS public.centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  logo_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_centers_slug ON public.centers(slug);

-- Profiles (Admin/SuperAdmin)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.role_type NOT NULL,
  center_id uuid REFERENCES public.centers(id) ON DELETE CASCADE,
  full_name text,
  telegram_id bigint UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_center ON public.profiles(center_id);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON public.profiles(telegram_id);

COMMENT ON TABLE public.profiles IS 'Admin and SuperAdmin user profiles';
COMMENT ON COLUMN public.profiles.telegram_id IS 'Optional Telegram user ID for admin/superadmin bot integration';

-- Global Users (Persistent Student Accounts)
CREATE TABLE IF NOT EXISTS public.global_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login text UNIQUE NOT NULL,
  surname text NOT NULL,
  name text NOT NULL,
  phone_number text NOT NULL,
  telegram_id bigint UNIQUE,
  telegram_username text,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_users_login ON public.global_users(login);
CREATE INDEX IF NOT EXISTS idx_global_users_telegram_id ON public.global_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_global_users_phone ON public.global_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_global_users_auth ON public.global_users(auth_user_id);

COMMENT ON TABLE public.global_users IS 'Persistent student accounts - registered via Bot or Website';
COMMENT ON COLUMN public.global_users.telegram_id IS 'Optional - links to Telegram for bot integration';

-- Tests (Exam Definitions)
CREATE TABLE IF NOT EXISTS public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  exam_type public.exam_type NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 120,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tests_center ON public.tests(center_id);
CREATE INDEX IF NOT EXISTS idx_tests_exam_type ON public.tests(exam_type);

-- Questions (for Tests)
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  expected_answer text NOT NULL,
  order_num int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_test ON public.questions(test_id, order_num);

-- Exam Requests (Student Registration Workflow)
CREATE TABLE IF NOT EXISTS public.exam_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.global_users(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  exam_type public.exam_type NOT NULL,
  test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_requests_user ON public.exam_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_requests_center_status ON public.exam_requests(center_id, status);
CREATE INDEX IF NOT EXISTS idx_exam_requests_status ON public.exam_requests(status);

COMMENT ON TABLE public.exam_requests IS 'Student exam registration requests awaiting admin approval';

-- Exam Attempts (Active Exam Sessions)
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.global_users(id) ON DELETE CASCADE,
  exam_request_id uuid NOT NULL REFERENCES public.exam_requests(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  exam_type public.exam_type NOT NULL,
  test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'in_progress', 'submitted', 'expired')),
  started_at timestamptz,
  expires_at timestamptz,
  submission_id uuid REFERENCES public.submissions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON public.exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_expires ON public.exam_attempts(expires_at);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_request ON public.exam_attempts(exam_request_id);

COMMENT ON TABLE public.exam_attempts IS 'Active exam sessions with 6-hour timer (created after admin approval)';

-- Submissions (Student Exam Answers)
CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.global_users(id) ON DELETE SET NULL,
  generated_student_id uuid, -- Legacy: kept for historical data (table may not exist)
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  exam public.exam_type NOT NULL,
  test_id uuid REFERENCES public.tests(id),
  student_full_name text NOT NULL,
  phone_number text,
  answers jsonb NOT NULL,
  -- Legacy columns (kept for historical data compatibility)
  student_login text,
  student_exam public.exam_type,
  student_test_name text,
  student_created_at timestamptz,
  -- Grading fields
  is_graded boolean NOT NULL DEFAULT false,
  graded_at timestamptz,
  graded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_center ON public.submissions(center_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at);

COMMENT ON COLUMN public.submissions.user_id IS 'Reference to global user (new architecture)';
COMMENT ON COLUMN public.submissions.generated_student_id IS 'Legacy reference (kept for historical data)';

-- Scores (Graded Exam Results)
CREATE TABLE IF NOT EXISTS public.scores (
  submission_id uuid PRIMARY KEY REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.global_users(id) ON DELETE SET NULL,
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  exam public.exam_type NOT NULL,
  auto_score jsonb,
  manual_score jsonb,
  final_score jsonb, -- Nullable: set after grading
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scores_user ON public.scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_center ON public.scores(center_id);

COMMENT ON COLUMN public.scores.user_id IS 'Reference to global user for easier queries';

-- Notifications (Admin/SuperAdmin Inbox)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON public.notifications(recipient_user_id, created_at);

-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================

-- is_superadmin() - Check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'superadmin'
  );
$$;

-- update_global_users_updated_at() - Trigger function
CREATE OR REPLACE FUNCTION public.update_global_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- cleanup_expired_attempts() - Mark expired exam attempts
CREATE OR REPLACE FUNCTION public.cleanup_expired_attempts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count int := 0;
BEGIN
  UPDATE public.exam_attempts
  SET status = 'expired'
  WHERE expires_at < now()
    AND status = 'in_progress';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'expired_count', expired_count,
    'timestamp', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_attempts() TO authenticated;

COMMENT ON FUNCTION public.cleanup_expired_attempts IS 'Called by Edge Function to mark expired exam attempts (6h timer)';

-- =========================================================
-- TRIGGERS
-- =========================================================

-- Update global_users.updated_at on update
DROP TRIGGER IF EXISTS trg_global_users_updated_at ON public.global_users;
CREATE TRIGGER trg_global_users_updated_at
BEFORE UPDATE ON public.global_users
FOR EACH ROW
EXECUTE FUNCTION public.update_global_users_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================

-- Enable RLS on all tables
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- Centers: Public read, superadmin write
DROP POLICY IF EXISTS "centers_public_read" ON public.centers;
CREATE POLICY "centers_public_read"
ON public.centers FOR SELECT
USING (true);

DROP POLICY IF EXISTS "centers_superadmin_write" ON public.centers;
CREATE POLICY "centers_superadmin_write"
ON public.centers FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Profiles: Self read OR superadmin read, superadmin write
DROP POLICY IF EXISTS "profiles_self_or_superadmin_read" ON public.profiles;
CREATE POLICY "profiles_self_or_superadmin_read"
ON public.profiles FOR SELECT
USING (user_id = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS "profiles_superadmin_write" ON public.profiles;
CREATE POLICY "profiles_superadmin_write"
ON public.profiles FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Global Users: Self read, admin read all, no client write
DROP POLICY IF EXISTS "users_self_read" ON public.global_users;
CREATE POLICY "users_self_read"
ON public.global_users FOR SELECT
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "users_admin_read" ON public.global_users;
CREATE POLICY "users_admin_read"
ON public.global_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role IN ('center_admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "users_no_client_write" ON public.global_users;
CREATE POLICY "users_no_client_write"
ON public.global_users FOR ALL
USING (false)
WITH CHECK (false);

-- Tests: Authenticated users can read (for browsing), admins can manage
DROP POLICY IF EXISTS "tests_authenticated_read" ON public.tests;
CREATE POLICY "tests_authenticated_read"
ON public.tests FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "tests_center_admin_all" ON public.tests;
CREATE POLICY "tests_center_admin_all"
ON public.tests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = tests.center_id
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = tests.center_id
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
);

DROP POLICY IF EXISTS "tests_superadmin_read" ON public.tests;
CREATE POLICY "tests_superadmin_read"
ON public.tests FOR SELECT
USING (public.is_superadmin());

-- Questions: Admins can manage, students can read only during active exam
DROP POLICY IF EXISTS "questions_via_test_access" ON public.questions;
DROP POLICY IF EXISTS "questions_student_read" ON public.questions;

CREATE POLICY "questions_via_test_access"
ON public.questions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tests t
    JOIN public.profiles p ON p.center_id = t.center_id
    WHERE t.id = questions.test_id
    AND p.user_id = auth.uid()
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tests t
    JOIN public.profiles p ON p.center_id = t.center_id
    WHERE t.id = questions.test_id
    AND p.user_id = auth.uid()
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
);

CREATE POLICY "questions_student_read"
ON public.questions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.exam_attempts ea
    JOIN public.global_users gu ON gu.id = ea.user_id
    WHERE gu.auth_user_id = auth.uid()
      AND ea.test_id = questions.test_id
      AND ea.status IN ('ready', 'in_progress')
      AND (ea.expires_at IS NULL OR ea.expires_at > now())
  )
);

-- Exam Requests: Students can read/create own, admins can read/update their center's
DROP POLICY IF EXISTS "requests_self_read" ON public.exam_requests;
CREATE POLICY "requests_self_read"
ON public.exam_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.global_users u
    WHERE u.id = exam_requests.user_id
    AND u.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "requests_student_insert" ON public.exam_requests;
CREATE POLICY "requests_student_insert"
ON public.exam_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.global_users u
    WHERE u.id = exam_requests.user_id
    AND u.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "requests_admin_read" ON public.exam_requests;
CREATE POLICY "requests_admin_read"
ON public.exam_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = exam_requests.center_id
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
);

DROP POLICY IF EXISTS "requests_admin_update" ON public.exam_requests;
CREATE POLICY "requests_admin_update"
ON public.exam_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = exam_requests.center_id
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = exam_requests.center_id
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
);

DROP POLICY IF EXISTS "requests_admin_delete" ON public.exam_requests;
CREATE POLICY "requests_admin_delete"
ON public.exam_requests FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = exam_requests.center_id
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
);

-- Exam Attempts: Students can read/update own, admins can read their center's
DROP POLICY IF EXISTS "attempts_self_read" ON public.exam_attempts;
CREATE POLICY "attempts_self_read"
ON public.exam_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.global_users u
    WHERE u.id = exam_attempts.user_id
    AND u.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "attempts_student_update" ON public.exam_attempts;
CREATE POLICY "attempts_student_update"
ON public.exam_attempts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.global_users u
    WHERE u.id = exam_attempts.user_id
    AND u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.global_users u
    WHERE u.id = exam_attempts.user_id
    AND u.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "attempts_admin_all" ON public.exam_attempts;
CREATE POLICY "attempts_admin_all"
ON public.exam_attempts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = exam_attempts.center_id
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
);

-- Submissions: Students can insert/read own, admins can read/update/delete their center's
DROP POLICY IF EXISTS "submissions_student_insert" ON public.submissions;
CREATE POLICY "submissions_student_insert"
ON public.submissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.global_users u
    WHERE u.id = submissions.user_id
      AND u.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "submissions_student_read" ON public.submissions;
CREATE POLICY "submissions_student_read"
ON public.submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.global_users u
    WHERE u.id = submissions.user_id
      AND u.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "submissions_admin_all" ON public.submissions;
CREATE POLICY "submissions_admin_all"
ON public.submissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = submissions.center_id
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
);

-- Scores: Students can read published own, admins can manage their center's
DROP POLICY IF EXISTS "scores_center_admin_manage" ON public.scores;
DROP POLICY IF EXISTS "scores_student_read_published" ON public.scores;
DROP POLICY IF EXISTS "scores_student_read_published_v2" ON public.scores;
DROP POLICY IF EXISTS "scores_superadmin_read" ON public.scores;

-- Center admins can manage scores for their center
CREATE POLICY "scores_center_admin_manage"
ON public.scores FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = scores.center_id
    AND p.role = 'center_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = scores.center_id
    AND p.role = 'center_admin'
  )
);

-- Students can read their own published scores
CREATE POLICY "scores_student_read_published"
ON public.scores FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.global_users gu ON gu.id = s.user_id
    WHERE s.id = scores.submission_id
      AND gu.auth_user_id = auth.uid()
  )
);

-- Students can read published scores (v2 - uses user_id directly)
CREATE POLICY "scores_student_read_published_v2"
ON public.scores FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1
    FROM public.global_users u
    WHERE u.id = scores.user_id
      AND u.auth_user_id = auth.uid()
  )
);

-- Super admins can read all scores
CREATE POLICY "scores_superadmin_read"
ON public.scores FOR SELECT
USING (public.is_superadmin());

-- Notifications: Recipient can read/update
DROP POLICY IF EXISTS "notifications_recipient_read" ON public.notifications;
CREATE POLICY "notifications_recipient_read"
ON public.notifications FOR SELECT
USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_recipient_update" ON public.notifications;
CREATE POLICY "notifications_recipient_update"
ON public.notifications FOR UPDATE
USING (recipient_user_id = auth.uid())
WITH CHECK (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_no_client_insert" ON public.notifications;
CREATE POLICY "notifications_no_client_insert"
ON public.notifications FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS "notifications_no_client_delete" ON public.notifications;
CREATE POLICY "notifications_no_client_delete"
ON public.notifications FOR DELETE
USING (false);

-- =========================================================
-- ANALYTICS VIEWS
-- =========================================================

-- Exam Requests Summary (for admin dashboard)
CREATE OR REPLACE VIEW public.exam_requests_summary AS
SELECT
  c.id AS center_id,
  c.slug AS center_slug,
  c.name AS center_name,
  COUNT(*) FILTER (WHERE er.status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE er.status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE er.status = 'rejected') AS rejected_count,
  COUNT(*) AS total_requests
FROM public.centers c
LEFT JOIN public.exam_requests er ON er.center_id = c.id
GROUP BY c.id, c.slug, c.name;

COMMENT ON VIEW public.exam_requests_summary IS 'Admin dashboard: exam request counts by center';

-- Active Attempts Summary
CREATE OR REPLACE VIEW public.active_attempts_summary AS
SELECT
  c.id AS center_id,
  c.slug AS center_slug,
  c.name AS center_name,
  COUNT(*) FILTER (WHERE ea.status = 'ready') AS ready_count,
  COUNT(*) FILTER (WHERE ea.status = 'in_progress') AS in_progress_count,
  COUNT(*) FILTER (WHERE ea.status = 'submitted') AS submitted_count,
  COUNT(*) FILTER (WHERE ea.status = 'expired') AS expired_count
FROM public.centers c
LEFT JOIN public.exam_attempts ea ON ea.center_id = c.id
WHERE ea.created_at >= date_trunc('day', now() - interval '7 days')
GROUP BY c.id, c.slug, c.name;

COMMENT ON VIEW public.active_attempts_summary IS 'Active exam attempts (last 7 days) by center';

-- User Exam History (for student portal)
CREATE OR REPLACE VIEW public.user_exam_history AS
SELECT
  ea.id AS attempt_id,
  ea.user_id,
  u.login,
  u.surname,
  u.name,
  c.slug AS center_slug,
  c.name AS center_name,
  ea.exam_type,
  t.name AS test_name,
  ea.status,
  ea.started_at,
  ea.expires_at,
  ea.created_at,
  s.id AS submission_id,
  sc.final_score,
  sc.is_published
FROM public.exam_attempts ea
JOIN public.global_users u ON u.id = ea.user_id
JOIN public.centers c ON c.id = ea.center_id
LEFT JOIN public.tests t ON t.id = ea.test_id
LEFT JOIN public.submissions s ON s.id = ea.submission_id
LEFT JOIN public.scores sc ON sc.submission_id = s.id
ORDER BY ea.created_at DESC;

COMMENT ON VIEW public.user_exam_history IS 'Complete exam history for student portal dashboard';

-- =========================================================
-- VERIFICATION
-- =========================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Complete database schema created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - centers';
  RAISE NOTICE '  - profiles (with telegram_id)';
  RAISE NOTICE '  - global_users';
  RAISE NOTICE '  - tests';
  RAISE NOTICE '  - questions';
  RAISE NOTICE '  - exam_requests';
  RAISE NOTICE '  - exam_attempts';
  RAISE NOTICE '  - submissions';
  RAISE NOTICE '  - scores';
  RAISE NOTICE '  - notifications';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - exam_requests_summary';
  RAISE NOTICE '  - active_attempts_summary';
  RAISE NOTICE '  - user_exam_history';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - is_superadmin()';
  RAISE NOTICE '  - update_global_users_updated_at()';
  RAISE NOTICE '  - cleanup_expired_attempts()';
  RAISE NOTICE '';
  RAISE NOTICE 'All RLS policies configured.';
END $$;

COMMIT;

-- =========================================================
-- END OF COMPLETE SCHEMA
-- =========================================================

