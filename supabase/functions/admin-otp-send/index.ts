import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_NAME = "Near Konnect App";
const SENDER_DOMAIN = "notify.nearkonnect.com";
const FROM_DOMAIN = SENDER_DOMAIN;

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsRes, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsRes?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsRes.claims.sub as string;
    const email = claimsRes.claims.email as string;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // role check
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // rate limit: max 5 codes per 15 min
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await admin.from("admin_otp_codes").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
    if ((count ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Too many requests. Try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

    await admin.from("admin_otp_codes").insert({ user_id: userId, code_hash, expires_at });

    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#fff;padding:24px;color:#111">
      <div style="max-width:480px;margin:0 auto;border:1px solid #eee;border-radius:12px;padding:32px">
        <h1 style="font-size:20px;margin:0 0 12px">${SITE_NAME} – Admin verification</h1>
        <p style="color:#555;margin:0 0 20px">Use this code to unlock the admin panel. It expires in 10 minutes.</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f4f4f5;padding:16px;text-align:center;border-radius:8px">${code}</div>
        <p style="color:#888;font-size:12px;margin:24px 0 0">If you didn't request this, ignore this email and consider changing your password.</p>
      </div></body></html>`;
    const text = `${SITE_NAME} admin verification code: ${code} (expires in 10 minutes)`;

    const messageId = crypto.randomUUID();
    const runId = crypto.randomUUID();

    await admin.from("email_send_log").insert({
      message_id: messageId, template_name: "admin_otp", recipient_email: email, status: "pending",
    });

    const { error: enqueueError } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: email,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: "Your admin verification code",
        html,
        text,
        purpose: "transactional",
        label: "admin_otp",
        idempotency_key: `admin-otp-${messageId}`,
        queued_at: new Date().toISOString(),
      },
    });
    if (enqueueError) {
      console.error("enqueue failed", enqueueError);
      return new Response(JSON.stringify({ error: "Failed to send code" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, email }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
