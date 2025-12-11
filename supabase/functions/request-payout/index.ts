import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REQUEST-PAYOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get affiliate record
    const { data: affiliate, error: affiliateError } = await supabaseClient
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (affiliateError || !affiliate) {
      throw new Error("Affiliate record not found");
    }
    logStep("Found affiliate", { 
      affiliateId: affiliate.id, 
      pendingBalance: affiliate.pending_balance,
      minThreshold: affiliate.min_payout_threshold 
    });

    // Check if onboarded
    if (!affiliate.stripe_connect_onboarded || !affiliate.stripe_connect_id) {
      throw new Error("Please complete Stripe Connect onboarding first");
    }

    // Check minimum threshold
    const pendingBalance = Number(affiliate.pending_balance) || 0;
    const minThreshold = Number(affiliate.min_payout_threshold) || 25;

    if (pendingBalance < minThreshold) {
      throw new Error(`Minimum payout threshold is $${minThreshold}. Current balance: $${pendingBalance.toFixed(2)}`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create transfer to connected account
    const amountInCents = Math.floor(pendingBalance * 100);
    
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd',
      destination: affiliate.stripe_connect_id,
      metadata: {
        affiliate_id: affiliate.id,
        user_id: user.id,
      },
    });
    logStep("Transfer created", { transferId: transfer.id, amount: amountInCents });

    // Record payout
    const { error: payoutError } = await supabaseClient
      .from('affiliate_payouts')
      .insert({
        affiliate_id: affiliate.id,
        amount: pendingBalance,
        status: 'completed',
        stripe_transfer_id: transfer.id,
        paid_at: new Date().toISOString(),
      });

    if (payoutError) {
      logStep("Error recording payout", { error: payoutError });
    }

    // Update affiliate balances
    const { error: updateError } = await supabaseClient
      .from('affiliates')
      .update({
        pending_balance: 0,
        total_earnings: (Number(affiliate.total_earnings) || 0) + pendingBalance,
      })
      .eq('id', affiliate.id);

    if (updateError) {
      logStep("Error updating affiliate", { error: updateError });
    }

    logStep("Payout completed successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      amount: pendingBalance,
      transfer_id: transfer.id,
    }), {
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
