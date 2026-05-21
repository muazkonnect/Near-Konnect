import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Walk an object and collect { kind, url } for image fields we care about.
function collectImages(decision: any): { kind: "id_front" | "id_back" | "selfie"; url: string }[] {
  const out: { kind: any; url: string }[] = [];
  const seen = new Set<string>();
  const push = (kind: any, url?: string | null) => {
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) return;
    const key = `${kind}:${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, url });
  };

  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    for (const [k, v] of Object.entries(node)) {
      const key = k.toLowerCase();
      if (typeof v === "string") {
        if (/(front).*(image|url|photo)|(image|url|photo).*front/.test(key) || key === "front_image" || key === "document_front")
          push("id_front", v);
        else if (/(back).*(image|url|photo)|(image|url|photo).*back/.test(key) || key === "back_image" || key === "document_back")
          push("id_back", v);
        else if (key.includes("portrait") || key.includes("selfie") || key.includes("face_image") || key === "reference_image" || key === "live_image" || key === "liveness_image")
          push("selfie", v);
      } else if (typeof v === "object") walk(v);
    }
  };
  walk(decision);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("DIDIT_API_KEY");
    if (!apiKey) return j({ error: "Didit not configured" }, 500);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "Unauthorized" }, 401);

    const { session_id } = await req.json();
    if (!session_id) return j({ error: "session_id required" }, 400);

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find verification row for this user + session
    const { data: vrow, error: vErr } = await svc
      .from("worker_verifications")
      .select("id, user_id")
      .eq("user_id", user.id)
      .eq("persona_inquiry_id", session_id)
      .maybeSingle();
    if (vErr) return j({ error: vErr.message }, 500);
    if (!vrow) return j({ error: "Verification not found" }, 404);

    // Fetch decision from Didit
    const dResp = await fetch(`https://verification.didit.me/v3/session/${session_id}/decision/`, {
      headers: { "x-api-key": apiKey },
    });
    const decision = await dResp.json();
    if (!dResp.ok) return j({ error: "Didit decision fetch failed", details: decision }, 502);

    // Persist raw decision
    await svc.from("worker_verifications")
      .update({ persona_payload: decision, persona_status: decision?.status ?? null, updated_at: new Date().toISOString() })
      .eq("id", vrow.id);

    // Download and upload each image
    const images = collectImages(decision);
    const stored: { kind: string; storage_path: string }[] = [];
    for (const img of images) {
      try {
        const r = await fetch(img.url, { headers: { "x-api-key": apiKey } });
        if (!r.ok) continue;
        const ct = r.headers.get("content-type") || "image/jpeg";
        const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
        const buf = new Uint8Array(await r.arrayBuffer());
        const path = `${vrow.user_id}/didit-${session_id}-${img.kind}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await svc.storage.from("verification-docs")
          .upload(path, buf, { contentType: ct, upsert: false });
        if (upErr) { console.error("upload", upErr); continue; }
        const { error: insErr } = await svc.from("verification_documents").insert({
          verification_id: vrow.id, user_id: vrow.user_id, kind: img.kind, storage_path: path,
        });
        if (insErr) { console.error("doc insert", insErr); continue; }
        stored.push({ kind: img.kind, storage_path: path });
      } catch (e) { console.error("img err", e); }
    }

    return j({ ok: true, stored_count: stored.length, status: decision?.status });
  } catch (e: any) {
    return j({ error: String(e?.message || e) }, 500);
  }
});
