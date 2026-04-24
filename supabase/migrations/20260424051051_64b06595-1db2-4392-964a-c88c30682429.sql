-- Allow admins to update and delete any worker record (for hide/unhide and removal from admin panel)
CREATE POLICY "Admins can update any worker"
ON public.workers
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::app_role, auth.uid()))
WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can delete any worker"
ON public.workers
FOR DELETE
TO authenticated
USING (public.has_role('admin'::app_role, auth.uid()));