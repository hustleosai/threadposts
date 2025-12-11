import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const SUBSCRIPTION_PRICE = 5; // $5/month
const COMMISSION_RATE = 0.50; // 50% commission

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body for affiliate_id
    let affiliateId = null;
    try {
      const body = await req.json();
      affiliateId = body.affiliate_id;
    } catch {
      // No body or no affiliate_id, that's fine
    }
    logStep("Affiliate ID from request", { affiliateId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Build metadata
    const metadata: Record<string, string> = {
      user_id: user.id,
    };
    
    if (affiliateId) {
      metadata.affiliate_id = affiliateId;
      metadata.commission_amount = String(SUBSCRIPTION_PRICE * COMMISSION_RATE);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: "price_1SczUKDfNHMKrGiAGJyzqRNW",
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?checkout=success`,
      cancel_url: `${req.headers.get("origin")}/dashboard?checkout=canceled`,
      metadata,
      subscription_data: {
        metadata,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, metadata });

    // If there's an affiliate, record the conversion and add commission
    if (affiliateId) {
      // Record conversion
      const { error: conversionError } = await supabaseClient
        .from('referral_conversions')
        .insert({
          affiliate_id: affiliateId,
          referred_user_id: user.id,
        });

      if (conversionError) {
        logStep("Error recording conversion", { error: conversionError });
      } else {
        logStep("Conversion recorded");
      }

      // Add commission to pending balance
      const commissionAmount = SUBSCRIPTION_PRICE * COMMISSION_RATE;
      
      // Get current affiliate data
      const { data: affiliate } = await supabaseClient
        .from('affiliates')
        .select('pending_balance, min_payout_threshold')
        .eq('id', affiliateId)
        .single();

      if (affiliate) {
        const currentBalance = Number(affiliate.pending_balance) || 0;
        const threshold = Number(affiliate.min_payout_threshold) || 25;
        const newBalance = currentBalance + commissionAmount;
        const wasUnderThreshold = currentBalance < threshold;
        const nowAtOrOverThreshold = newBalance >= threshold;
        
        await supabaseClient
          .from('affiliates')
          .update({ pending_balance: newBalance })
          .eq('id', affiliateId);

        // Record earning
        await supabaseClient
          .from('affiliate_earnings')
          .insert({
            affiliate_id: affiliateId,
            amount: commissionAmount,
            stripe_payment_id: session.id,
          });

        logStep("Commission added", { affiliateId, commissionAmount, newBalance });

        // Send threshold notification if they just crossed it
        if (wasUnderThreshold && nowAtOrOverThreshold) {
          logStep("Affiliate crossed payout threshold, sending notification");
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-threshold-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                affiliate_id: affiliateId,
                new_balance: newBalance,
                threshold: threshold,
              }),
            });
            logStep("Threshold notification sent");
          } catch (notifError) {
            logStep("Failed to send threshold notification", { error: notifError });
          }
        }
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
