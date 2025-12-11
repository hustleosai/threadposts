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

    // Note: Commission recording is now handled by stripe-webhook after successful payment
    // The affiliate_id is stored in session/subscription metadata for webhook processing

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
