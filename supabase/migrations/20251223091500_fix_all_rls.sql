-- Fix exam_attempts policies to allow writes by admins and students
DROP POLICY IF EXISTS "attempts_no_client_write" ON public.exam_attempts;
DROP POLICY IF EXISTS "attempts_self_read" ON public.exam_attempts;
DROP POLICY IF EXISTS "attempts_admin_read" ON public.exam_attempts;
DROP POLICY IF EXISTS "attempts_student_update" ON public.exam_attempts;
DROP POLICY IF EXISTS "attempts_admin_all" ON public.exam_attempts;

CREATE POLICY "attempts_self_read"
ON public.exam_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.global_users u
    WHERE u.id = exam_attempts.user_id
    AND u.auth_user_id = auth.uid()
  )
);

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

-- Ensure submissions can be deleted by admins
DROP POLICY IF EXISTS "submissions_admin_delete" ON public.submissions;
DROP POLICY IF EXISTS "submissions_student_insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions_student_read" ON public.submissions;
DROP POLICY IF EXISTS "submissions_admin_all" ON public.submissions;

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

-- Ensure scores can be deleted by admins
DROP POLICY IF EXISTS "scores_admin_delete" ON public.scores;
DROP POLICY IF EXISTS "scores_student_read" ON public.scores;
DROP POLICY IF EXISTS "scores_admin_all" ON public.scores;

CREATE POLICY "scores_student_read"
ON public.scores FOR SELECT
USING (
  (is_published = true AND EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.global_users u ON u.id = s.user_id
    WHERE s.id = scores.submission_id
    AND u.auth_user_id = auth.uid()
  ))
);

CREATE POLICY "scores_admin_all"
ON public.scores FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = scores.center_id
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
);

