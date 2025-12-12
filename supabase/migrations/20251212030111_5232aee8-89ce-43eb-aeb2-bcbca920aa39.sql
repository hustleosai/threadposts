-- Add location column to profiles for storing user's signup location
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location TEXT;