-- Add status and uploaded_by columns to viral_images
ALTER TABLE public.viral_images 
ADD COLUMN status text NOT NULL DEFAULT 'approved',
ADD COLUMN uploaded_by uuid REFERENCES auth.users(id);

-- Update existing images to approved status
UPDATE public.viral_images SET status = 'approved' WHERE status IS NULL;

-- Create storage bucket for viral images
INSERT INTO storage.buckets (id, name, public) VALUES ('viral-images', 'viral-images', true);

-- Storage policies for viral images
CREATE POLICY "Anyone can view viral images" ON storage.objects FOR SELECT USING (bucket_id = 'viral-images');

CREATE POLICY "Authenticated users can upload viral images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'viral-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own uploads" ON storage.objects FOR UPDATE USING (bucket_id = 'viral-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete viral images" ON storage.objects FOR DELETE USING (bucket_id = 'viral-images' AND has_role(auth.uid(), 'admin'));

-- Update RLS for viral_images table
DROP POLICY IF EXISTS "Anyone can view viral images" ON public.viral_images;

-- Users can only see approved images (or their own pending)
CREATE POLICY "Users can view approved images or own pending" ON public.viral_images FOR SELECT USING (
  status = 'approved' OR uploaded_by = auth.uid() OR has_role(auth.uid(), 'admin')
);

-- Authenticated users can submit images (pending)
CREATE POLICY "Users can submit images" ON public.viral_images FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND uploaded_by = auth.uid() AND status = 'pending'
);

-- Admins can update any image (approve/reject)
CREATE POLICY "Admins can update images" ON public.viral_images FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Admins can delete images
CREATE POLICY "Admins can delete images" ON public.viral_images FOR DELETE USING (has_role(auth.uid(), 'admin'));