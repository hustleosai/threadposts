-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all thread history
CREATE POLICY "Admins can view all threads" 
ON public.thread_history 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete any thread
CREATE POLICY "Admins can delete any thread" 
ON public.thread_history 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));