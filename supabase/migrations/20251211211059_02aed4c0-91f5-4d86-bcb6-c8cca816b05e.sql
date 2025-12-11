-- Drop existing SELECT policies on profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a single consolidated SELECT policy that allows users to view their own profile OR admins to view all
CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
);

-- Ensure unauthenticated users cannot access profiles at all (RLS is already enabled)
-- No additional policy needed as RLS defaults to deny