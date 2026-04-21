// Dispatches push notifications to a user's registered devices.
// Body: { user_id: string, title: string, body: string, url?: string, tag?: string, urgent?: boolean }
// Auth: Service-role only (called from DB triggers via pg_net, which sends the service role key)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:noreply@nearkonnect.app";
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") || "";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) {
    console.error("VAPID config invalid", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { user_id, title, body: text, url, tag, urgent } = body || {};
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "Missing user_id or title" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body: text, url, tag, urgent });
    let sent = 0;
    let removed = 0;

    for (const s of subs) {
      try {
        if (s.platform === "web" && s.endpoint && s.p256dh && s.auth) {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } else if ((s.platform === "android" || s.platform === "ios") && s.fcm_token && FCM_SERVER_KEY) {
          const r = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              Authorization: `key=${FCM_SERVER_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: s.fcm_token,
              notification: { title, body: text || "", click_action: url || "/" },
              data: { url: url || "/", tag: tag || "" },
            }),
          });
          if (r.ok) sent++;
          else if (r.status === 404 || r.status === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
            removed++;
          }
        }
      } catch (err: any) {
        const status = err?.statusCode || err?.status;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
          removed++;
        } else {
          console.warn("Push send failed", err?.message || err);
        }
      }
    }

    return new Response(JSON.stringify({ sent, removed, total: subs.length }), {
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
