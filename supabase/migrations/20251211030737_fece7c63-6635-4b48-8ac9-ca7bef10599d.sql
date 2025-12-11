-- Create image_categories table
CREATE TABLE public.image_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view categories" ON public.image_categories FOR SELECT USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can insert categories" ON public.image_categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.image_categories FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.image_categories FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Insert default categories
INSERT INTO public.image_categories (name) VALUES 
  ('Motivation'),
  ('Tech'),
  ('Business'),
  ('Lifestyle'),
  ('Education'),
  ('Finance'),
  ('Health'),
  ('Other');