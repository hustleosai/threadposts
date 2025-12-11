-- Add policy for users to view their own billing data
CREATE POLICY "Users can view own billing" 
ON public.user_billing 
FOR SELECT 
USING (auth.uid() = user_id);