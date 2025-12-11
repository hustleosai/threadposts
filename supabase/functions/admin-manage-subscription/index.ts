import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-MANAGE-SUBSCRIPTION] ${step}${detailsStr}`);
};

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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Authenticate the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const adminUser = userData.user;
    if (!adminUser) throw new Error("User not authenticated");

    // Verify the user is an admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Access denied. Admin privileges required.");
    }
    logStep("Admin verified", { adminId: adminUser.id });

    const { action, email, subscriptionId } = await req.json();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    if (action === "list") {
      // List all subscriptions
      logStep("Listing subscriptions");
      const subscriptions = await stripe.subscriptions.list({
        limit: 100,
        expand: ['data.customer'],
      });

      const formattedSubs = subscriptions.data.map((sub: Stripe.Subscription) => ({
        id: sub.id,
        status: sub.status,
        customerEmail: typeof sub.customer === 'object' && sub.customer !== null ? (sub.customer as Stripe.Customer).email : null,
        customerId: typeof sub.customer === 'object' && sub.customer !== null ? (sub.customer as Stripe.Customer).id : sub.customer,
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        created: new Date(sub.created * 1000).toISOString(),
      }));

      logStep("Subscriptions fetched", { count: formattedSubs.length });
      return new Response(JSON.stringify({ subscriptions: formattedSubs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "get" && email) {
      // Get subscription for a specific user by email
      logStep("Getting subscription for email", { email });
      const customers = await stripe.customers.list({ email, limit: 1 });
      
      if (customers.data.length === 0) {
        return new Response(JSON.stringify({ subscription: null, message: "No customer found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return new Response(JSON.stringify({ subscription: null, message: "No subscription found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const sub = subscriptions.data[0];
      return new Response(JSON.stringify({
        subscription: {
          id: sub.id,
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "cancel" && subscriptionId) {
      // Cancel subscription at period end
      logStep("Canceling subscription", { subscriptionId });
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      logStep("Subscription canceled", { subscriptionId, cancelAt: subscription.cancel_at });
      return new Response(JSON.stringify({
        success: true,
        message: "Subscription will be canceled at the end of the billing period",
        cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "cancelImmediately" && subscriptionId) {
      // Cancel subscription immediately
      logStep("Canceling subscription immediately", { subscriptionId });
      const subscription = await stripe.subscriptions.cancel(subscriptionId);

      logStep("Subscription canceled immediately", { subscriptionId, status: subscription.status });
      return new Response(JSON.stringify({
        success: true,
        message: "Subscription has been canceled immediately",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "reactivate" && subscriptionId) {
      // Reactivate a subscription that was set to cancel
      logStep("Reactivating subscription", { subscriptionId });
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      logStep("Subscription reactivated", { subscriptionId });
      return new Response(JSON.stringify({
        success: true,
        message: "Subscription has been reactivated",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "getPayments" && subscriptionId) {
      // Get recent payments for a subscription to allow refunds
      logStep("Getting payments for subscription", { subscriptionId });
      
      // Get the subscription to find the customer
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      
      // Get recent payment intents for this customer
      const paymentIntents = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 10,
      });

      const payments = paymentIntents.data
        .filter((pi: Stripe.PaymentIntent) => pi.status === 'succeeded')
        .map((pi: Stripe.PaymentIntent) => ({
          id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          created: new Date(pi.created * 1000).toISOString(),
          refunded: pi.amount_received !== pi.amount || (pi.charges?.data?.[0]?.refunded ?? false),
        }));

      logStep("Payments fetched", { count: payments.length });
      return new Response(JSON.stringify({ payments }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "refund") {
      const { paymentIntentId, amount, customerEmail } = await req.json().catch(() => ({}));
      if (!paymentIntentId) throw new Error("Payment intent ID is required for refund");
      
      logStep("Processing refund", { paymentIntentId, amount });
      
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
      };
      
      // If amount is provided, do a partial refund; otherwise full refund
      if (amount && amount > 0) {
        refundParams.amount = amount;
      }
      
      const refund = await stripe.refunds.create(refundParams);
      
      logStep("Refund processed", { refundId: refund.id, amount: refund.amount, status: refund.status });

      // Send email notification if customer email is provided
      if (customerEmail) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
          
          await fetch(`${supabaseUrl}/functions/v1/send-refund-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              customerEmail,
              refundAmount: refund.amount,
              currency: refund.currency,
              refundId: refund.id,
            }),
          });
          logStep("Refund notification email sent", { customerEmail });
        } catch (emailError) {
          logStep("Failed to send refund notification email", { error: emailError });
          // Don't fail the refund if email fails
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Refund of $${(refund.amount / 100).toFixed(2)} has been processed`,
        refundId: refund.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid action or missing parameters");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});