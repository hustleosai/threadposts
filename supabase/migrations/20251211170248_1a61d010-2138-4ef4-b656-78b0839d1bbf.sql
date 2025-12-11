-- Add admin SELECT policies to affiliate-related tables for oversight
CREATE POLICY "Admins can view all earnings" 
ON public.affiliate_earnings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all payouts" 
ON public.affiliate_payouts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payouts" 
ON public.affiliate_payouts 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all clicks" 
ON public.referral_clicks 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all conversions" 
ON public.referral_conversions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all affiliates" 
ON public.affiliates 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));