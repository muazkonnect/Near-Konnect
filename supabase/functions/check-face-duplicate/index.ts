// Pre-signup duplicate-face check.
// - Public (no JWT required) so the signup form can call it before account creation.
// - Detects exactly one face, then searches the global Face++ FaceSet for matches.
// - Returns { duplicate: boolean } and (when duplicate) a generic message.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FACEPP_BASE = "https://api-us.faceplusplus.com/facepp/v3";
const FACESET_OUTER_ID = "nearkonnect_users";
const DUP_CONFIDENCE_FALLBACK = 73;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripDataUrl(input: string): string {
  const idx = input.indexOf(",");
  return input.startsWith("data:") && idx !== -1 ? input.slice(idx + 1) : input;
}

async function faceppCall(endpoint: string, form: FormData) {
  const apiKey = Deno.env.get("FACEPP_API_KEY");
  const apiSecret = Deno.env.get("FACEPP_API_SECRET");
  if (!apiKey || !apiSecret) throw new Error("Face++ credentials missing");
  form.append("api_key", apiKey);
  form.append("api_secret", apiSecret);
  const res = await fetch(`${FACEPP_BASE}/${endpoint}`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || data.error_message) {
    throw new Error(`Face++ ${endpoint} failed: ${data.error_message ?? res.statusText}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    const image = typeof body?.image === "string" ? body.image : "";
    if (!image) return jsonResponse({ error: "Missing image" }, 400);
    const base64 = stripDataUrl(image);
    if (base64.length < 1000) return jsonResponse({ error: "Image is too small" }, 400);
    if (base64.length > 7_000_000) return jsonResponse({ error: "Image too large" }, 400);

    // 1) Detect — must contain exactly one usable face.
    const detectForm = new FormData();
    detectForm.append("image_base64", base64);
    const detect = await faceppCall("detect", detectForm);
    const faces = (detect.faces ?? []) as Array<{ face_token: string }>;
    if (faces.length === 0) {
      return jsonResponse({ error: "No face detected. Please face the camera clearly." }, 422);
    }
    if (faces.length > 1) {
      return jsonResponse({ error: "Multiple faces detected. Only you should be in frame." }, 422);
    }
    const newToken = faces[0].face_token;

    // 2) Search the global FaceSet for matches.
    let search: Record<string, unknown> | null = null;
    try {
      const searchForm = new FormData();
      searchForm.append("face_token", newToken);
      searchForm.append("outer_id", FACESET_OUTER_ID);
      searchForm.append("return_result_count", "5");
      search = await faceppCall("search", searchForm);
    } catch (e) {
      const msg = (e as Error).message;
      if (/INVALID_OUTER_ID|FACESET_NOT_FOUND|outer_id/i.test(msg)) {
        // FaceSet not yet created — no enrolled faces, so cannot be a duplicate.
        return jsonResponse({ duplicate: false });
      }
      throw e;
    }

    const results = (search.results ?? []) as Array<{ face_token: string; confidence: number }>;
    const thresholds = (search.thresholds ?? {}) as Record<string, number>;
    const threshold = thresholds["1e-5"] ?? DUP_CONFIDENCE_FALLBACK;
    const matches = results.filter((r) => r.confidence >= threshold);
    if (matches.length === 0) return jsonResponse({ duplicate: false });

    // 3) Confirm the matched tokens map to a real registered profile.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const tokens = matches.map((m) => m.face_token);
    const { data: owners } = await admin
      .from("profiles")
      .select("user_id")
      .in("face_token", tokens)
      .limit(1);

    if (owners && owners.length > 0) {
      return jsonResponse({
        duplicate: true,
        error: "This face is already registered with another account. Only one account per person is allowed.",
      }, 409);
    }
    return jsonResponse({ duplicate: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("check-face-duplicate error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
