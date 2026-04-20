// Pre-signup duplicate-face check.
// - Public so the signup form can call it before account creation.
// - First tries FaceSet search for speed.
// - Then falls back to comparing against stored verified face images so older
//   accounts that were never added to the FaceSet are still blocked.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FACEPP_BASE = "https://api-us.faceplusplus.com/facepp/v3";
const FACESET_OUTER_ID = "nearkonnect_users";
const DUP_CONFIDENCE_FALLBACK = 73;
const STORAGE_BUCKET = "face-verifications";
const FALLBACK_COMPARE_LIMIT = 50;
const FACEPP_BUSY_RETRY_MS = 1200;
const KNOWN_FACEPP_BUSY_ERROR = "Face++ search failed: CONCURRENCY_LIMIT_EXCEEDED";

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

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function isFaceppBusyError(message: string) {
  return /CONCURRENCY_LIMIT_EXCEEDED|RATE_LIMIT_EXCEEDED|TOO_MANY_REQUESTS/i.test(message);
}

function retryableFaceppResponse(message: string = KNOWN_FACEPP_BUSY_ERROR) {
  return jsonResponse(
    {
      error: message,
      fallback: true,
      retryable: true,
      retry_after_ms: FACEPP_BUSY_RETRY_MS,
    },
    200,
  );
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

async function compareWithStoredImage(newBase64: string, storedBase64: string) {
  const compareForm = new FormData();
  compareForm.append("image_base64_1", newBase64);
  compareForm.append("image_base64_2", storedBase64);
  return await faceppCall("compare", compareForm);
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

    const detectForm = new FormData();
    detectForm.append("image_base64", base64);

    let detect;
    try {
      detect = await faceppCall("detect", detectForm);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Face++ detect failed";
      if (isFaceppBusyError(msg)) return retryableFaceppResponse(msg);
      throw err;
    }

    const faces = (detect.faces ?? []) as Array<{ face_token: string }>;
    if (faces.length === 0) {
      return jsonResponse({ error: "No face detected. Please face the camera clearly." }, 422);
    }
    if (faces.length > 1) {
      return jsonResponse({ error: "Multiple faces detected. Only you should be in frame." }, 422);
    }
    const newToken = faces[0].face_token;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
      const searchForm = new FormData();
      searchForm.append("face_token", newToken);
      searchForm.append("outer_id", FACESET_OUTER_ID);
      searchForm.append("return_result_count", "10");
      const search = await faceppCall("search", searchForm);
      const results = (search.results ?? []) as Array<{ face_token: string; confidence: number }>;
      const thresholds = (search.thresholds ?? {}) as Record<string, number>;
      const threshold = thresholds["1e-5"] ?? DUP_CONFIDENCE_FALLBACK;
      const matchedTokens = results.filter((r) => r.confidence >= threshold).map((r) => r.face_token);

      if (matchedTokens.length > 0) {
        const { data: owners } = await admin
          .from("profiles")
          .select("user_id")
          .in("face_token", matchedTokens)
          .limit(1);

        if (owners && owners.length > 0) {
          return jsonResponse({
            duplicate: true,
            error: "This face is already registered with another account. Only one account per person is allowed.",
          }, 409);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Face++ search failed";
      if (isFaceppBusyError(msg)) return retryableFaceppResponse(msg);
      if (!/INVALID_OUTER_ID|FACESET_NOT_FOUND|outer_id/i.test(msg)) throw err;
    }

    const { data: candidates, error: candidatesErr } = await admin
      .from("profiles")
      .select("user_id, face_image_path, face_verified_at")
      .not("face_image_path", "is", null)
      .eq("face_verified", true)
      .order("face_verified_at", { ascending: false })
      .limit(FALLBACK_COMPARE_LIMIT);

    if (candidatesErr) throw candidatesErr;

    for (const candidate of candidates ?? []) {
      if (!candidate.face_image_path) continue;
      try {
        const { data: file, error: downloadErr } = await admin.storage
          .from(STORAGE_BUCKET)
          .download(candidate.face_image_path);
        if (downloadErr || !file) continue;

        const storedBytes = new Uint8Array(await file.arrayBuffer());
        const storedBase64 = bytesToBase64(storedBytes);
        const compare = await compareWithStoredImage(base64, storedBase64);
        const confidence: number = compare.confidence ?? 0;
        const threshold: number = compare.thresholds?.["1e-5"] ?? DUP_CONFIDENCE_FALLBACK;

        if (confidence >= threshold) {
          return jsonResponse({
            duplicate: true,
            error: "This face is already registered with another account. Only one account per person is allowed.",
          }, 409);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Face++ compare failed";
        if (isFaceppBusyError(msg)) return retryableFaceppResponse(msg);
        console.warn("fallback compare skipped:", msg);
      }
    }

    return jsonResponse({ duplicate: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (isFaceppBusyError(msg)) {
      console.warn("check-face-duplicate busy:", msg);
      return retryableFaceppResponse(msg);
    }
    console.error("check-face-duplicate error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
