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
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON") || "";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) {
    console.error("VAPID config invalid", e);
  }
}

// ---- FCM HTTP v1: OAuth2 access token via service-account JWT ----
type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
};

let _sa: ServiceAccount | null = null;
function getServiceAccount(): ServiceAccount | null {
  if (_sa) return _sa;
  if (!FCM_SERVICE_ACCOUNT_JSON) return null;
  try {
    _sa = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
    return _sa;
  } catch (e) {
    console.error("FCM_SERVICE_ACCOUNT_JSON parse failed", e);
    return null;
  }
}

function b64urlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === "string") bytes = new TextEncoder().encode(data);
  else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data);
  else bytes = data;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToPkcs8(pem: string): Uint8Array {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(cleaned);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let _tokenCache: { token: string; expiresAt: number } | null = null;
async function getFcmAccessToken(): Promise<string | null> {
  const sa = getServiceAccount();
  if (!sa) return null;
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache && _tokenCache.expiresAt - 60 > now) return _tokenCache.token;

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64urlEncode(JSON.stringify(header))}.${b64urlEncode(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${b64urlEncode(sig)}`;

  const tokenRes = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) {
    console.error("FCM token exchange failed", tokenRes.status, await tokenRes.text());
    return null;
  }
  const j = await tokenRes.json();
  _tokenCache = { token: j.access_token, expiresAt: now + (j.expires_in || 3600) };
  return _tokenCache.token;
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

    const sa = getServiceAccount();
    const fcmToken = sa ? await getFcmAccessToken() : null;
    const fcmEndpoint = sa ? `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send` : "";

    for (const s of subs) {
      try {
        if (s.platform === "web" && s.endpoint && s.p256dh && s.auth) {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } else if ((s.platform === "android" || s.platform === "ios") && s.fcm_token && fcmToken) {
          const message: any = {
            token: s.fcm_token,
            notification: { title, body: text || "" },
            data: { url: String(url || "/"), tag: String(tag || "") },
            android: {
              priority: urgent ? "HIGH" : "NORMAL",
              notification: { click_action: url || "/" },
            },
            apns: {
              headers: { "apns-priority": urgent ? "10" : "5" },
              payload: { aps: { sound: "default" } },
            },
            webpush: { fcm_options: { link: url || "/" } },
          };
          const r = await fetch(fcmEndpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${fcmToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
          });
          if (r.ok) {
            sent++;
          } else {
            const errText = await r.text();
            // UNREGISTERED / INVALID_ARGUMENT for stale token
            if (
              r.status === 404 ||
              r.status === 410 ||
              errText.includes("UNREGISTERED") ||
              errText.includes("registration-token-not-registered")
            ) {
              await supabase.from("push_subscriptions").delete().eq("id", s.id);
              removed++;
            } else {
              console.warn("FCM v1 send failed", r.status, errText);
            }
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
