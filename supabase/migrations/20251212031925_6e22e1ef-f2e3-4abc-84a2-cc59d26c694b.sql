-- Create page_visits table for tracking visitor locations
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  country_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  page_path TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Only admins can view page visits
CREATE POLICY "Admins can view all page visits"
ON public.page_visits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow public inserts (for tracking anonymous visitors)
CREATE POLICY "Anyone can insert page visits"
ON public.page_visits
FOR INSERT
WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_page_visits_created_at ON public.page_visits(created_at DESC);

-- Add latitude and longitude to profiles table for user locations
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;