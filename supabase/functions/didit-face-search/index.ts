// Didit Face Search — dedupe a face against the org-wide enrolled index.
// On signup, we submit the captured selfie. If a high-similarity match exists,
// the account is treated as a duplicate and signup is rejected.
// When no match, the face is auto-enrolled (save_api_request=true), so the
// next attempt with the same face will match.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Similarity threshold (0-100). >=85 is a strong same-person signal.
const DUPLICATE_THRESHOLD = 85;

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("DIDIT_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Didit not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64, vendorData, enroll = true } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = base64ToBytes(imageBase64);
    const form = new FormData();
    form.append("user_image", new Blob([bytes], { type: "image/jpeg" }), "selfie.jpg");
    form.append("search_type", "most_similar");
    form.append("save_api_request", enroll ? "true" : "false");
    if (vendorData) form.append("vendor_data", String(vendorData));

    const resp = await fetch("https://verification.didit.me/v3/face-search/", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error("Didit face-search error", resp.status, data);
      return new Response(JSON.stringify({ error: data?.message || "Face search failed", details: data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matches: any[] = data?.face_search?.matches || [];
    const top = matches[0];
    const topScore = top?.similarity_percentage ?? 0;
    const duplicate = topScore >= DUPLICATE_THRESHOLD;
    const blocklisted = matches.some((m) => m?.is_blocklisted);

    return new Response(JSON.stringify({
      duplicate,
      blocklisted,
      topScore,
      matchVendorData: top?.vendor_data ?? null,
      totalMatches: data?.face_search?.total_matches ?? matches.length,
      requestId: data?.request_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("face-search exception", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
