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

// Rate limit: 1 click per IP per referral code per hour
const RATE_LIMIT_HOURS = 1;

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
    
    // Get IP address for rate limiting
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const cleanIp = ipAddress.split(",")[0].trim();
    
    logStep("Processing referral", { referral_code, source, ip: cleanIp });

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

    // Rate limiting: Check if this IP has clicked this affiliate's link recently
    const rateLimitTime = new Date();
    rateLimitTime.setHours(rateLimitTime.getHours() - RATE_LIMIT_HOURS);
    
    const { data: recentClicks, error: rateCheckError } = await supabaseClient
      .from('referral_clicks')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .eq('ip_address', cleanIp)
      .gte('created_at', rateLimitTime.toISOString())
      .limit(1);

    if (rateCheckError) {
      logStep("Rate limit check error", { error: rateCheckError });
    }

    if (recentClicks && recentClicks.length > 0) {
      logStep("Rate limited - duplicate click", { affiliateId: affiliate.id, ip: cleanIp });
      // Return success to avoid revealing rate limiting to potential attackers
      return new Response(JSON.stringify({ 
        success: true, 
        affiliate_id: affiliate.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Track the click
    const userAgent = req.headers.get("user-agent") || "unknown";

    const { error: clickError } = await supabaseClient
      .from('referral_clicks')
      .insert({
        affiliate_id: affiliate.id,
        ip_address: cleanIp,
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
