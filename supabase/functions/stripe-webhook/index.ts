import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const SUBSCRIPTION_PRICE = 5; // $5/month
const COMMISSION_RATE = 0.50; // 50% commission

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!signature || !webhookSecret) {
      logStep("Missing signature or webhook secret");
      return new Response("Missing signature or webhook secret", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err });
      return new Response(`Webhook Error: ${err}`, { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    // Handle successful subscription payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process subscription payments
      if (session.mode !== "subscription") {
        logStep("Not a subscription checkout, skipping");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const affiliateId = session.metadata?.affiliate_id;
      const userId = session.metadata?.user_id;
      const customerEmail = session.customer_email || session.customer_details?.email;

      logStep("Processing checkout session", { 
        sessionId: session.id, 
        affiliateId, 
        userId,
        customerEmail,
        paymentStatus: session.payment_status 
      });

      // Only process if payment was successful
      if (session.payment_status !== "paid") {
        logStep("Payment not completed, skipping commission");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Process affiliate commission if there's an affiliate
      if (affiliateId && userId) {
        logStep("Processing affiliate commission", { affiliateId, userId });

        // Check if conversion already exists to prevent duplicates
        const { data: existingConversion } = await supabaseClient
          .from('referral_conversions')
          .select('id')
          .eq('affiliate_id', affiliateId)
          .eq('referred_user_id', userId)
          .single();

        if (existingConversion) {
          logStep("Conversion already recorded, skipping", { existingConversion });
        } else {
          // Record conversion
          const { error: conversionError } = await supabaseClient
            .from('referral_conversions')
            .insert({
              affiliate_id: affiliateId,
              referred_user_id: userId,
            });

          if (conversionError) {
            logStep("Error recording conversion", { error: conversionError });
          } else {
            logStep("Conversion recorded successfully");
          }
        }

        // Check if this payment's commission was already recorded
        const { data: existingEarning } = await supabaseClient
          .from('affiliate_earnings')
          .select('id')
          .eq('affiliate_id', affiliateId)
          .eq('stripe_payment_id', session.id)
          .single();

        if (existingEarning) {
          logStep("Earning already recorded for this payment, skipping");
        } else {
          // Add commission to pending balance
          const commissionAmount = SUBSCRIPTION_PRICE * COMMISSION_RATE;

          // Get current affiliate data
          const { data: affiliate } = await supabaseClient
            .from('affiliates')
            .select('pending_balance, min_payout_threshold, user_id')
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

            // Record earning with checkout session ID
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
          } else {
            logStep("Affiliate not found", { affiliateId });
          }
        }
      }
    }

    // Handle recurring subscription payments
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Skip the first payment (already handled by checkout.session.completed)
      if (invoice.billing_reason === "subscription_create") {
        logStep("Initial subscription payment, already handled by checkout.session.completed");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Get subscription to access metadata
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const affiliateId = subscription.metadata?.affiliate_id;
        const userId = subscription.metadata?.user_id;

        logStep("Processing recurring payment", { 
          invoiceId: invoice.id,
          subscriptionId: subscription.id,
          affiliateId,
          userId,
          billingReason: invoice.billing_reason
        });

        if (affiliateId) {
          // Check if this invoice's commission was already recorded
          const { data: existingEarning } = await supabaseClient
            .from('affiliate_earnings')
            .select('id')
            .eq('affiliate_id', affiliateId)
            .eq('stripe_payment_id', invoice.id)
            .single();

          if (existingEarning) {
            logStep("Earning already recorded for this invoice, skipping");
          } else {
            const commissionAmount = SUBSCRIPTION_PRICE * COMMISSION_RATE;

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

              await supabaseClient
                .from('affiliate_earnings')
                .insert({
                  affiliate_id: affiliateId,
                  amount: commissionAmount,
                  stripe_payment_id: invoice.id,
                });

              logStep("Recurring commission added", { affiliateId, commissionAmount, newBalance });

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
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
});
