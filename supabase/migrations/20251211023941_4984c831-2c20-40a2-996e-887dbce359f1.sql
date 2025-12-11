-- Allow public insertion of referral clicks (via edge function with service role)
CREATE POLICY "Service role can insert clicks" 
ON public.referral_clicks 
FOR INSERT 
WITH CHECK (true);

-- Allow public insertion of conversions (via edge function with service role)
CREATE POLICY "Service role can insert conversions" 
ON public.referral_conversions 
FOR INSERT 
WITH CHECK (true);

-- Allow service role to insert earnings
CREATE POLICY "Service role can insert earnings" 
ON public.affiliate_earnings 
FOR INSERT 
WITH CHECK (true);