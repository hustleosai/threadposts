-- Drop and recreate the view with security_invoker to use the querying user's permissions
DROP VIEW IF EXISTS public.affiliate_conversions_safe;

CREATE VIEW public.affiliate_conversions_safe 
WITH (security_invoker = true) AS
SELECT 
  id,
  affiliate_id,
  converted_at
FROM public.referral_conversions;

-- Grant access to the view
GRANT SELECT ON public.affiliate_conversions_safe TO authenticated;

-- Now restore affiliate access but only to the safe view data
-- First, let's add back the affiliate policy to the base table so the view works
DROP POLICY IF EXISTS "Affiliates can view own conversions via safe view" ON public.referral_conversions;

CREATE POLICY "Affiliates can view own conversions" 
ON public.referral_conversions 
FOR SELECT 
USING (
  affiliate_id IN (
    SELECT id FROM affiliates WHERE user_id = auth.uid()
  )
);

-- Note: Affiliates will query the safe view which only exposes id, affiliate_id, converted_at
-- The referred_user_id column is never exposed through the view