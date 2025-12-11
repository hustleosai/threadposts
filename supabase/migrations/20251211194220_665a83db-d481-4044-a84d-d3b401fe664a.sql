-- Allow admins to insert images with any status (for direct uploads)
CREATE POLICY "Admins can insert images" 
ON public.viral_images 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));