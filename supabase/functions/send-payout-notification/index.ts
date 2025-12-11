import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYOUT-NOTIFICATION] ${step}${detailsStr}`);
};

interface PayoutNotificationRequest {
  affiliate_id: string;
  payout_amount: number;
  status: 'paid' | 'denied';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    logStep("User authenticated", { userId: userData.user?.id });

    const { affiliate_id, payout_amount, status }: PayoutNotificationRequest = await req.json();
    logStep("Request data", { affiliate_id, payout_amount, status });

    // Get affiliate details
    const { data: affiliate, error: affiliateError } = await supabaseClient
      .from('affiliates')
      .select('user_id, referral_code')
      .eq('id', affiliate_id)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error(`Affiliate not found: ${affiliateError?.message}`);
    }
    logStep("Affiliate found", { referralCode: affiliate.referral_code });

    // Get user email from profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('user_id', affiliate.user_id)
      .single();

    if (profileError || !profile?.email) {
      throw new Error(`User email not found: ${profileError?.message}`);
    }
    logStep("User email found", { email: profile.email });

    const isApproved = status === 'paid';
    const subject = isApproved 
      ? `🎉 Your payout of $${payout_amount.toFixed(2)} has been approved!`
      : `Payout request update`;

    const htmlContent = isApproved
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">Payout Approved! 🎉</h1>
          <p>Great news! Your affiliate payout request has been approved.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #10b981;">$${payout_amount.toFixed(2)}</p>
            <p style="margin: 5px 0 0; color: #6b7280;">Amount paid</p>
          </div>
          <p>The funds will be transferred to your connected Stripe account shortly.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Thank you for being a ThreadPosts affiliate!<br>
            - The ThreadPosts Team
          </p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">Payout Request Denied</h1>
          <p>Unfortunately, your payout request for <strong>$${payout_amount.toFixed(2)}</strong> has been denied.</p>
          <p>This could be due to:</p>
          <ul>
            <li>Incomplete Stripe Connect onboarding</li>
            <li>Suspicious activity detected</li>
            <li>Minimum threshold not met</li>
          </ul>
          <p>If you believe this is an error, please contact our support team.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            - The ThreadPosts Team
          </p>
        </div>
      `;

    const emailResponse = await resend.emails.send({
      from: "ThreadPosts <onboarding@resend.dev>",
      to: [profile.email],
      subject,
      html: htmlContent,
    });

    logStep("Email sent successfully", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
