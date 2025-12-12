import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[TRACK-VISIT] Function started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { page_path, user_agent } = body;

    // Get client IP from headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    console.log('[TRACK-VISIT] Client IP:', clientIp);

    // Fetch geolocation data from IP
    let geoData = {
      city: null as string | null,
      region: null as string | null,
      country: null as string | null,
      country_code: null as string | null,
      latitude: null as number | null,
      longitude: null as number | null,
    };

    try {
      // Use ipapi.co for geolocation (free tier available)
      const geoResponse = await fetch(`https://ipapi.co/${clientIp}/json/`, {
        signal: AbortSignal.timeout(5000),
      });
      
      if (geoResponse.ok) {
        const geo = await geoResponse.json();
        geoData = {
          city: geo.city || null,
          region: geo.region || null,
          country: geo.country_name || null,
          country_code: geo.country_code || null,
          latitude: geo.latitude || null,
          longitude: geo.longitude || null,
        };
        console.log('[TRACK-VISIT] Geo data retrieved:', geoData);
      }
    } catch (geoError) {
      console.log('[TRACK-VISIT] Geolocation lookup failed:', geoError);
    }

    // Insert the visit record
    const { error } = await supabase.from('page_visits').insert({
      ip_address: clientIp,
      city: geoData.city,
      region: geoData.region,
      country: geoData.country,
      country_code: geoData.country_code,
      latitude: geoData.latitude,
      longitude: geoData.longitude,
      page_path,
      user_agent,
    });

    if (error) {
      console.error('[TRACK-VISIT] Insert error:', error);
      throw error;
    }

    console.log('[TRACK-VISIT] Visit tracked successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TRACK-VISIT] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
