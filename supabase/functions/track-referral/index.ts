import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRACK-REFERRAL] ${step}${detailsStr}`);
};

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

    const { referral_code, source } = await req.json();
    
    if (!referral_code) {
      throw new Error("Referral code is required");
    }
    logStep("Processing referral", { referral_code, source });

    // Find affiliate by referral code
    const { data: affiliate, error: affiliateError } = await supabaseClient
      .from('affiliates')
      .select('id')
      .eq('referral_code', referral_code)
      .single();

    if (affiliateError || !affiliate) {
      logStep("Affiliate not found", { referral_code });
      return new Response(JSON.stringify({ success: false, error: "Invalid referral code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Track the click
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const { error: clickError } = await supabaseClient
      .from('referral_clicks')
      .insert({
        affiliate_id: affiliate.id,
        ip_address: ipAddress.split(",")[0].trim(),
        user_agent: userAgent.substring(0, 500),
        source: source || "direct",
      });

    if (clickError) {
      logStep("Error tracking click", { error: clickError });
    } else {
      logStep("Click tracked successfully", { affiliateId: affiliate.id });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      affiliate_id: affiliate.id 
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
