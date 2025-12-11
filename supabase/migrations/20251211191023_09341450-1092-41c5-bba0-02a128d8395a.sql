-- Create affiliate_deductions table to track commission reversals
CREATE TABLE public.affiliate_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  reason text NOT NULL,
  refund_id text,
  original_earning_id uuid REFERENCES public.affiliate_earnings(id),
  customer_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_deductions ENABLE ROW LEVEL SECURITY;

-- Affiliates can view their own deductions
CREATE POLICY "Affiliates can view own deductions"
ON public.affiliate_deductions
FOR SELECT
USING (affiliate_id IN (
  SELECT id FROM affiliates WHERE user_id = auth.uid()
));

-- Admins can view all deductions
CREATE POLICY "Admins can view all deductions"
ON public.affiliate_deductions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Service role can insert deductions
CREATE POLICY "Service role can insert deductions"
ON public.affiliate_deductions
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_affiliate_deductions_affiliate_id ON public.affiliate_deductions(affiliate_id);
CREATE INDEX idx_affiliate_deductions_refund_id ON public.affiliate_deductions(refund_id);