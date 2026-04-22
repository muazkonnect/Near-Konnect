CREATE POLICY "Clients can re-request after denial"
ON public.contact_reveals
FOR UPDATE
TO authenticated
USING (auth.uid() = client_user_id AND status = 'denied')
WITH CHECK (auth.uid() = client_user_id AND status = 'pending');