-- Add has_free_access column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN has_free_access boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.has_free_access IS 'Grants user full access without requiring a paid subscription';