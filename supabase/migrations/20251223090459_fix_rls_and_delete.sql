-- Fix exam_attempts policies to allow writes by admins and students
DROP POLICY IF EXISTS "attempts_no_client_write" ON public.exam_attempts;

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
CREATE POLICY "submissions_admin_delete"
ON public.submissions FOR DELETE
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
CREATE POLICY "scores_admin_delete"
ON public.scores FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.center_id = scores.center_id
    AND p.role = 'center_admin'
  )
  OR public.is_superadmin()
);

