-- Add RLS policies for admin template management
CREATE POLICY "Admins can insert templates" 
ON public.templates 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update templates" 
ON public.templates 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete templates" 
ON public.templates 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));