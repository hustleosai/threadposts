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
  console.log(`[AFFILIATE-WELCOME] ${step}${detailsStr}`);
};

interface AffiliateWelcomeRequest {
  referral_code: string;
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

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User email not found");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { referral_code }: AffiliateWelcomeRequest = await req.json();
    logStep("Request data", { referral_code });

    const referralLink = `https://threadposts.com?ref=${referral_code}`;

    // Send welcome email to new affiliate
    const emailResponse = await resend.emails.send({
      from: "ThreadPosts <hello@threadposts.com>",
      to: [user.email],
      subject: "🎉 Welcome to the ThreadPosts Affiliate Program!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #ffffff;">
          <h1 style="color: #a855f7; margin-bottom: 20px;">Welcome to the Affiliate Program! 🎉</h1>
          
          <p style="color: #d1d5db; line-height: 1.6;">
            Congratulations! You're now a ThreadPosts affiliate. Here's everything you need to start earning.
          </p>
          
          <div style="background: #262626; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #a855f7; margin-top: 0;">Your Referral Link</h3>
            <p style="background: #1f1f1f; padding: 12px; border-radius: 6px; font-family: monospace; word-break: break-all; color: #10b981;">
              ${referralLink}
            </p>
          </div>
          
          <div style="background: #262626; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #a855f7; margin-top: 0;">Program Benefits</h3>
            <ul style="color: #d1d5db; padding-left: 20px;">
              <li style="margin-bottom: 8px;"><strong style="color: #10b981;">50% Commission</strong> on every sale</li>
              <li style="margin-bottom: 8px;"><strong style="color: #10b981;">$25 Minimum Payout</strong> via Stripe</li>
              <li style="margin-bottom: 8px;"><strong style="color: #10b981;">Lifetime Attribution</strong> - earn on all future purchases</li>
            </ul>
          </div>
          
          <div style="background: #262626; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #a855f7; margin-top: 0;">Next Steps</h3>
            <ol style="color: #d1d5db; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Connect your Stripe account in the dashboard</li>
              <li style="margin-bottom: 8px;">Share your referral link on social media</li>
              <li style="margin-bottom: 8px;">Use our marketing tools (banners, templates)</li>
              <li style="margin-bottom: 8px;">Track your earnings in real-time</li>
            </ol>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Questions? Reply to this email and we'll help you get started.
            <br><br>
            Happy earning!<br>
            - The ThreadPosts Team
          </p>
        </div>
      `,
    });

    logStep("Welcome email sent successfully", emailResponse);

    // Also notify admin about new affiliate signup
    await resend.emails.send({
      from: "ThreadPosts <hello@threadposts.com>",
      to: ["hello@threadposts.com"],
      subject: `New Affiliate Signup: ${user.email}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>New Affiliate Signup 🎉</h2>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Referral Code:</strong> ${referral_code}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
    });

    logStep("Admin notification sent");

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
