import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SESSION_HOURS = 8;

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

    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Invalid code format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const code_hash = await sha256(code);
    const { data: row } = await admin
      .from("admin_otp_codes")
      .select("*")
      .eq("user_id", userId)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ error: "Code expired or not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if ((row.attempts ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Too many attempts" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (row.code_hash !== code_hash) {
      await admin.from("admin_otp_codes").update({ attempts: (row.attempts ?? 0) + 1 }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "Incorrect code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("admin_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    // Issue session token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const token_hash = await sha256(token);
    const expires_at = new Date(Date.now() + SESSION_HOURS * 3600_000).toISOString();

    await admin.from("admin_sessions").insert({
      user_id: userId,
      token_hash,
      expires_at,
      ip: req.headers.get("x-forwarded-for") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    });

    return new Response(JSON.stringify({ ok: true, token, expires_at }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
