-- =========================================================
-- FIX: Allow students to browse available tests at centers
-- Without this, students can't see tests to request them!
-- =========================================================

-- Drop the restrictive student policy
DROP POLICY IF EXISTS "tests_student_read" ON public.tests;

-- New policy: All authenticated users can read tests (for browsing)
-- This allows students to see available tests at any center
CREATE POLICY "tests_authenticated_read"
ON public.tests FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Note: Questions are still protected - students only see questions
-- when they have an active exam attempt. Test metadata is public to
-- logged-in users so they can browse and request exams.

