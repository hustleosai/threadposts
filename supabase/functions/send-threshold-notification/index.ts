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
  console.log(`[THRESHOLD-NOTIFICATION] ${step}${detailsStr}`);
};

interface ThresholdNotificationRequest {
  affiliate_id: string;
  new_balance: number;
  threshold: number;
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

    const { affiliate_id, new_balance, threshold }: ThresholdNotificationRequest = await req.json();
    logStep("Request received", { affiliate_id, new_balance, threshold });

    // Get affiliate and user details
    const { data: affiliate, error: affiliateError } = await supabaseClient
      .from('affiliates')
      .select('user_id, referral_code')
      .eq('id', affiliate_id)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error(`Affiliate not found: ${affiliateError?.message}`);
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', affiliate.user_id)
      .single();

    if (profileError || !profile?.email) {
      throw new Error(`Profile not found: ${profileError?.message}`);
    }

    logStep("Affiliate found", { email: profile.email, referralCode: affiliate.referral_code });

    // Send email to affiliate
    const emailResponse = await resend.emails.send({
      from: "ThreadPosts <hello@threadposts.com>",
      to: [profile.email],
      subject: "🎉 You've reached your payout threshold!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .balance-box { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #10b981; }
            .balance { font-size: 36px; font-weight: bold; color: #10b981; }
            .button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Payout Threshold Reached!</h1>
            </div>
            <div class="content">
              <p>Hi ${profile.full_name || 'there'},</p>
              
              <p>Great news! Your affiliate earnings have reached the payout threshold of $${threshold.toFixed(2)}!</p>
              
              <div class="balance-box">
                <p style="margin: 0; color: #666;">Your Current Balance</p>
                <p class="balance">$${new_balance.toFixed(2)}</p>
              </div>
              
              <p>You can now request a payout from your affiliate dashboard. Here's what you need to do:</p>
              
              <ol>
                <li>Go to your <strong>Affiliate Dashboard</strong></li>
                <li>Make sure your Stripe Connect account is set up</li>
                <li>Click the <strong>"Request Payout"</strong> button</li>
              </ol>
              
              <center>
                <a href="https://threadposts.com/dashboard" class="button">Go to Dashboard</a>
              </center>
              
              <p>Keep up the great work promoting ThreadPosts! Every referral you make earns you 50% of the subscription fee.</p>
              
              <p>Best regards,<br>The ThreadPosts Team</p>
            </div>
            <div class="footer">
              <p>This email was sent because you're an affiliate partner of ThreadPosts.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    logStep("Threshold notification email sent", { emailResponse });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
