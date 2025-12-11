-- Remove customer_email from affiliate_deductions to protect customer privacy
-- Affiliates should not see which specific customers requested refunds
ALTER TABLE public.affiliate_deductions DROP COLUMN IF EXISTS customer_email;