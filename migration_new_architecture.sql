-- =========================================================
-- EDUASSESS NEW ARCHITECTURE MIGRATION
-- Bot-First Registration & Approval System
-- =========================================================
-- 
-- This migration transforms the system from:
--   - Temporary generated credentials (one-time use)
-- To:
--   - Global persistent users (register via Bot or Website)
--   - Registration → Approval → Exam workflow
--   - Telegram linking support
--
-- Project: exnfvzzoxprgrzgkylnl
-- Dashboard: https://supabase.com/dashboard/project/exnfvzzoxprgrzgkylnl
-- Created: 2024-12-23
-- =========================================================

BEGIN;

-- =========================================================
-- STEP 1: CREATE NEW TABLES
-- =========================================================

-- 1.1 Global Users Table (replaces generated_students)
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

-- 1.2 Exam Requests Table (registration workflow)
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

-- 1.3 Exam Attempts Table (active exam sessions)
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

-- =========================================================
-- STEP 2: UPDATE EXISTING TABLES
-- =========================================================

-- 2.1 Update submissions table
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.global_users(id) ON DELETE SET NULL;

-- Make generated_student_id nullable (for historical data)
ALTER TABLE public.submissions
  ALTER COLUMN generated_student_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_user ON public.submissions(user_id);

COMMENT ON COLUMN public.submissions.user_id IS 'Reference to global user (new architecture)';
COMMENT ON COLUMN public.submissions.generated_student_id IS 'Legacy reference (kept for historical data)';

-- 2.2 Update scores table
ALTER TABLE public.scores
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.global_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_scores_user ON public.scores(user_id);

COMMENT ON COLUMN public.scores.user_id IS 'Reference to global user for easier queries';

-- =========================================================
-- STEP 3: DROP OLD STRUCTURE
-- =========================================================

-- IMPORTANT:
-- Postgres requires the table to exist for "DROP POLICY ... ON table".
-- So we guard all legacy drops with to_regclass() checks to make this migration idempotent.

DO $$
BEGIN
  -- 3.1 Drop old RLS policies
  IF to_regclass('public.generated_students') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "gen_students_read" ON public.generated_students';
    EXECUTE 'DROP POLICY IF EXISTS "gen_students_no_client_insert" ON public.generated_students';
    EXECUTE 'DROP POLICY IF EXISTS "gen_students_no_client_update" ON public.generated_students';
    EXECUTE 'DROP POLICY IF EXISTS "gen_students_no_client_delete" ON public.generated_students';
    EXECUTE 'DROP POLICY IF EXISTS "gen_students_self_read" ON public.generated_students';
  END IF;

  IF to_regclass('public.student_access') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "student_access_self_read" ON public.student_access';
    EXECUTE 'DROP POLICY IF EXISTS "student_access_no_client_insert" ON public.student_access';
    EXECUTE 'DROP POLICY IF EXISTS "student_access_no_client_update" ON public.student_access';
    EXECUTE 'DROP POLICY IF EXISTS "student_access_no_client_delete" ON public.student_access';
  END IF;

  -- 3.2 Drop old triggers
  IF to_regclass('public.generated_students') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_generated_student_created ON public.generated_students';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_backup_student_info ON public.generated_students';
  END IF;

  -- 3.3 Drop old functions
  EXECUTE 'DROP FUNCTION IF EXISTS public.on_generated_student_created() CASCADE';
  EXECUTE 'DROP FUNCTION IF EXISTS public.backup_student_info_to_submissions() CASCADE';

  -- 3.4 Drop old views (they reference deleted tables)
  EXECUTE 'DROP VIEW IF EXISTS public.center_generation_stats CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.center_generation_daily_last7 CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.testname_generation_daily_last7 CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.testname_generation_stats CASCADE';
  EXECUTE 'DROP VIEW IF EXISTS public.generation_activity_recent CASCADE';

  -- 3.5 Drop old tables
  EXECUTE 'DROP TABLE IF EXISTS public.student_access CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS public.generation_events CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS public.generated_students CASCADE';
END $$;

-- =========================================================
-- STEP 4: CREATE RLS POLICIES FOR NEW TABLES
-- =========================================================

-- 4.1 Enable RLS
ALTER TABLE public.global_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- 4.2 Global Users Policies
-- Students can read their own record
DROP POLICY IF EXISTS "users_self_read" ON public.global_users;
CREATE POLICY "users_self_read"
ON public.global_users FOR SELECT
USING (auth_user_id = auth.uid());

-- Admins can read all users
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

-- No direct client writes (use Edge Function)
DROP POLICY IF EXISTS "users_no_client_write" ON public.global_users;
CREATE POLICY "users_no_client_write"
ON public.global_users FOR ALL
USING (false)
WITH CHECK (false);

-- 4.3 Exam Requests Policies
-- Students can read their own requests
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

-- Students can create requests
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

-- Center admins can read requests for their center
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

-- Center admins can update (approve/reject) their center's requests
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

-- 4.4 Exam Attempts Policies
-- Students can read their own attempts
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

-- Admins can read attempts for their center
DROP POLICY IF EXISTS "attempts_admin_read" ON public.exam_attempts;
CREATE POLICY "attempts_admin_read"
ON public.exam_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = exam_attempts.center_id
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
);

-- No direct client writes (use Edge Function)
DROP POLICY IF EXISTS "attempts_no_client_write" ON public.exam_attempts;
CREATE POLICY "attempts_no_client_write"
ON public.exam_attempts FOR ALL
USING (false)
WITH CHECK (false);

-- =========================================================
-- STEP 5: UPDATE SUBMISSION POLICIES (for new user_id)
-- =========================================================

-- Drop old submission policies
DROP POLICY IF EXISTS "submissions_student_insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions_student_read" ON public.submissions;

-- Students can insert their own submissions (via exam_attempts)
CREATE POLICY "submissions_student_insert_v2"
ON public.submissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.global_users u
    WHERE u.id = submissions.user_id
    AND u.auth_user_id = auth.uid()
  )
);

-- Students can read their own submissions
CREATE POLICY "submissions_student_read_v2"
ON public.submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.global_users u
    WHERE u.id = submissions.user_id
    AND u.auth_user_id = auth.uid()
  )
);

-- =========================================================
-- STEP 6: UPDATE SCORE POLICIES (for new user_id)
-- =========================================================

-- Drop old score student policy
DROP POLICY IF EXISTS "scores_student_read_published" ON public.scores;

-- Students can read their own published scores
CREATE POLICY "scores_student_read_published_v2"
ON public.scores FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1 FROM public.global_users u
    WHERE u.id = scores.user_id
    AND u.auth_user_id = auth.uid()
  )
);

-- =========================================================
-- STEP 7: CREATE HELPER FUNCTIONS
-- =========================================================

-- 7.1 Trigger to update global_users.updated_at
CREATE OR REPLACE FUNCTION public.update_global_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_global_users_updated_at ON public.global_users;
CREATE TRIGGER trg_global_users_updated_at
BEFORE UPDATE ON public.global_users
FOR EACH ROW
EXECUTE FUNCTION public.update_global_users_updated_at();

-- 7.2 Function to cleanup expired exam attempts
CREATE OR REPLACE FUNCTION public.cleanup_expired_attempts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count int := 0;
BEGIN
  -- Mark attempts as expired where expires_at < now and status = 'in_progress'
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
-- STEP 8: CREATE ANALYTICS VIEWS (New Architecture)
-- =========================================================

-- 8.1 Exam requests by center (for admin dashboard)
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

-- 8.2 Active exam attempts by center
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

-- 8.3 User exam history (for student portal)
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
-- STEP 9: GRANT PERMISSIONS
-- =========================================================

-- Views are accessible based on underlying table RLS
-- No additional grants needed

-- =========================================================
-- VERIFICATION
-- =========================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'New tables created:';
  RAISE NOTICE '  - global_users';
  RAISE NOTICE '  - exam_requests';
  RAISE NOTICE '  - exam_attempts';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated tables:';
  RAISE NOTICE '  - submissions (added user_id)';
  RAISE NOTICE '  - scores (added user_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'Removed tables:';
  RAISE NOTICE '  - generated_students';
  RAISE NOTICE '  - student_access';
  RAISE NOTICE '  - generation_events';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Deploy Edge Functions';
  RAISE NOTICE '  2. Update Telegram Bot';
  RAISE NOTICE '  3. Update Frontend';
  RAISE NOTICE '';
  RAISE NOTICE 'Dashboard: https://supabase.com/dashboard/project/exnfvzzoxprgrzgkylnl';
END $$;

COMMIT;

-- =========================================================
-- ROLLBACK SCRIPT (keep commented, use if needed)
-- =========================================================
/*
BEGIN;

-- Restore old tables (requires backup)
-- Run pg_restore or load from backup.sql

-- Drop new tables
DROP TABLE IF EXISTS public.exam_attempts CASCADE;
DROP TABLE IF EXISTS public.exam_requests CASCADE;
DROP TABLE IF EXISTS public.global_users CASCADE;

-- Remove columns from updated tables
ALTER TABLE public.submissions DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.scores DROP COLUMN IF EXISTS user_id;

COMMIT;
*/

