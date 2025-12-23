-- Allow admins to delete exam requests
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

