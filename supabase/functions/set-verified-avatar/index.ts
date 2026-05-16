// Uploads the verified face capture as the user's permanent avatar.
// Only succeeds if the profile has no existing avatar (one-time, unchangeable).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { userId, imageBase64 } = await req.json();
    if (!userId || !imageBase64) {
      return new Response(JSON.stringify({ error: "userId and imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Make sure no avatar is already set (enforces unchangeability)
    const { data: profile } = await admin
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.avatar_url) {
      return new Response(JSON.stringify({ error: "Profile photo already set" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const b64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${userId}/avatar.jpg`;

    const { error: upErr } = await admin.storage
      .from("avatars")
      .upload(path, bin, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { error: updErr } = await admin
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", userId);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ avatar_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("set-verified-avatar error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
