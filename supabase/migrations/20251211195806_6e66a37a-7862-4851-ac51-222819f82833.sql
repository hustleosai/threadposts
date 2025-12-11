-- Create a secure view for affiliates that excludes referred_user_id
CREATE OR REPLACE VIEW public.affiliate_conversions_safe AS
SELECT 
  id,
  affiliate_id,
  converted_at
FROM public.referral_conversions;

-- Grant access to the view
GRANT SELECT ON public.affiliate_conversions_safe TO authenticated;

-- Drop the old affiliate policy that exposes referred_user_id
DROP POLICY IF EXISTS "Affiliates can view own conversions" ON public.referral_conversions;

-- Create a more restrictive policy - affiliates can only count their conversions, not see details
-- We'll keep admin access to the full table
CREATE POLICY "Affiliates can view own conversions via safe view" 
ON public.referral_conversions 
FOR SELECT 
USING (
  -- Admins can see everything
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Service role can see everything (for edge functions)
  auth.role() = 'service_role'
);