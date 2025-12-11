import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REFUND-NOTIFICATION] ${step}${detailsStr}`);
};

interface RefundNotificationRequest {
  customerEmail: string;
  refundAmount: number;
  currency: string;
  refundId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { customerEmail, refundAmount, currency, refundId }: RefundNotificationRequest = await req.json();
    logStep("Request data", { customerEmail, refundAmount, currency, refundId });

    if (!customerEmail) {
      throw new Error("Customer email is required");
    }

    const formattedAmount = (refundAmount / 100).toFixed(2);
    const currencySymbol = currency.toUpperCase() === 'USD' ? '$' : currency.toUpperCase();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #111827; color: #f9fafb;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f9fafb; margin: 0;">ThreadPosts</h1>
        </div>
        
        <div style="background: #1f2937; padding: 30px; border-radius: 12px; border: 1px solid #374151;">
          <h2 style="color: #10b981; margin-top: 0;">Refund Processed ✓</h2>
          
          <p style="color: #d1d5db; line-height: 1.6;">
            We've processed a refund to your account. Here are the details:
          </p>
          
          <div style="background: #111827; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #10b981;">
              ${currencySymbol}${formattedAmount}
            </p>
            <p style="margin: 8px 0 0; color: #9ca3af; font-size: 14px;">Refund Amount</p>
          </div>
          
          <div style="border-top: 1px solid #374151; padding-top: 20px; margin-top: 20px;">
            <p style="color: #9ca3af; font-size: 14px; margin: 5px 0;">
              <strong style="color: #d1d5db;">Refund ID:</strong> ${refundId}
            </p>
          </div>
          
          <p style="color: #d1d5db; line-height: 1.6; margin-top: 20px;">
            The refund should appear in your account within 5-10 business days, depending on your bank or card issuer.
          </p>
          
          <p style="color: #d1d5db; line-height: 1.6;">
            If you have any questions about this refund, please don't hesitate to reach out to our support team.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #374151;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} ThreadPosts. All rights reserved.
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0;">
            You received this email because a refund was processed for your account.
          </p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "ThreadPosts <hello@threadposts.com>",
      to: [customerEmail],
      subject: `Refund of ${currencySymbol}${formattedAmount} has been processed`,
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
