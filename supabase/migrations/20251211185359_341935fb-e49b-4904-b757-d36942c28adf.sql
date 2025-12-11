-- Create a separate user_billing table for sensitive payment data
-- This table is NOT accessible via client-side queries (no SELECT policy for users)
CREATE TABLE public.user_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  subscription_id text,
  subscription_status public.subscription_status DEFAULT 'trialing',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_billing ENABLE ROW LEVEL SECURITY;

-- NO SELECT policy for regular users - this data is only accessible via edge functions
-- Only service role can read/write this table
CREATE POLICY "Service role full access" 
ON public.user_billing 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Admins can view for support purposes (read-only)
CREATE POLICY "Admins can view billing data" 
ON public.user_billing 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Migrate existing data from profiles to user_billing
INSERT INTO public.user_billing (user_id, stripe_customer_id, subscription_id, subscription_status)
SELECT user_id, stripe_customer_id, subscription_id, subscription_status
FROM public.profiles
WHERE stripe_customer_id IS NOT NULL OR subscription_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_user_billing_updated_at
BEFORE UPDATE ON public.user_billing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Now remove sensitive columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS stripe_customer_id,
DROP COLUMN IF EXISTS subscription_id,
DROP COLUMN IF EXISTS subscription_status;