// Notifies nearby blood donors of an urgent/critical blood request.
// Body: { request_id: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RADIUS_KM = 25;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: "Missing request_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: br, error: brErr } = await supabase
      .from("blood_requests")
      .select("id, blood_group, urgency, city, message, latitude, longitude, requester_id")
      .eq("id", request_id)
      .maybeSingle();

    if (brErr || !br) throw brErr || new Error("Request not found");
    if (br.latitude == null || br.longitude == null) {
      return new Response(JSON.stringify({ sent: 0, reason: "no location" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: donors, error: dErr } = await supabase.rpc("get_nearby_blood_donors", {
      req_lat: br.latitude,
      req_lng: br.longitude,
      req_blood_group: br.blood_group,
      radius_km: RADIUS_KM,
    });

    if (dErr) throw dErr;

    const targets = (donors || []).filter((d: any) => d.user_id !== br.requester_id);
    let sent = 0;

    const title = `🩸 ${br.urgency === "critical" ? "CRITICAL: " : ""}${br.blood_group} Blood Needed`;
    const body = `${br.city ? `In ${br.city} · ` : ""}Tap to help now`;

    for (const d of targets) {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            user_id: d.user_id,
            title,
            body,
            url: "/blood-donors",
            tag: `blood-${br.id}`,
            urgent: true,
          }),
        });
        if (r.ok) sent++;
      } catch (e) {
        console.warn("notify donor failed", e);
      }
    }

    return new Response(JSON.stringify({ sent, total: targets.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
