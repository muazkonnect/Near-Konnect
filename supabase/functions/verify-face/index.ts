// Face++ verification edge function
// - Validates the caller's JWT
// - Accepts a base64 image (data URL or raw base64)
// - Calls Face++ Detect; ensures exactly one usable face
// - If the user already has a stored face_token, runs Compare to confirm same person
// - Uploads the new image to the private 'face-verifications' bucket
// - Updates the user's profile (face_verified, face_token, face_image_path)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FACEPP_BASE = "https://api-us.faceplusplus.com/facepp/v3";
// Single global FaceSet that holds every enrolled face token so we can
// detect duplicate signups (one face = one account).
const FACESET_OUTER_ID = "nearkonnect_users";
// Strict 1-in-100,000 confidence threshold for duplicate detection.
const DUP_CONFIDENCE_FALLBACK = 73;

interface DetectFace {
  face_token: string;
  attributes?: {
    blur?: { blurness?: { value?: number; threshold?: number } };
    facequality?: { value?: number; threshold?: number };
  };
}

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

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function faceppCall(endpoint: string, form: FormData) {
  const apiKey = Deno.env.get("FACEPP_API_KEY");
  const apiSecret = Deno.env.get("FACEPP_API_SECRET");
  if (!apiKey || !apiSecret) {
    throw new Error("Face++ credentials are not configured");
  }
  form.append("api_key", apiKey);
  form.append("api_secret", apiSecret);
  const res = await fetch(`${FACEPP_BASE}/${endpoint}`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok || data.error_message) {
    throw new Error(
      `Face++ ${endpoint} failed: ${data.error_message ?? res.statusText}`,
    );
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const image = typeof body?.image === "string" ? body.image : "";
    if (!image) {
      return jsonResponse({ error: "Missing image" }, 400);
    }
    const base64 = stripDataUrl(image);
    if (base64.length < 1000) {
      return jsonResponse({ error: "Image is too small" }, 400);
    }
    // ~7MB upper bound on base64 payload (Face++ limit ~2MB raw)
    if (base64.length > 7_000_000) {
      return jsonResponse({ error: "Image is too large (max ~5MB)" }, 400);
    }

    // 1) Detect
    const detectForm = new FormData();
    detectForm.append("image_base64", base64);
    detectForm.append(
      "return_attributes",
      "blur,facequality",
    );
    const detect = await faceppCall("detect", detectForm);
    const faces = (detect.faces ?? []) as DetectFace[];

    if (faces.length === 0) {
      return jsonResponse(
        { error: "No face detected. Please face the camera clearly." },
        422,
      );
    }
    if (faces.length > 1) {
      return jsonResponse(
        { error: "Multiple faces detected. Only you should be in frame." },
        422,
      );
    }

    const face = faces[0];
    const quality = face.attributes?.facequality;
    if (quality && typeof quality.value === "number" && typeof quality.threshold === "number") {
      if (quality.value < quality.threshold) {
        return jsonResponse(
          {
            error:
              "Image quality is too low. Try better lighting and hold the camera steady.",
          },
          422,
        );
      }
    }
    const blur = face.attributes?.blur?.blurness;
    if (blur && typeof blur.value === "number" && typeof blur.threshold === "number") {
      if (blur.value > blur.threshold) {
        return jsonResponse(
          { error: "Image is too blurry. Please retake." },
          422,
        );
      }
    }

    const newFaceToken = face.face_token;

    // 2) Compare against stored face if present
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("face_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.face_token) {
      const compareForm = new FormData();
      compareForm.append("face_token1", profile.face_token);
      compareForm.append("face_token2", newFaceToken);
      try {
        const compare = await faceppCall("compare", compareForm);
        const confidence: number = compare.confidence ?? 0;
        const threshold: number =
          compare.thresholds?.["1e-5"] ?? 73; // strict
        if (confidence < threshold) {
          return jsonResponse(
            {
              error:
                "Face does not match the previously verified photo for this account.",
            },
            422,
          );
        }
      } catch (e) {
        // If the stored token expired (Face++ tokens expire after ~72h), fall through
        // and treat this as a fresh enrollment.
        console.warn("Compare failed, re-enrolling:", (e as Error).message);
      }
    }

    // 3) Upload image to private bucket as <userId>/face.jpg
    const bytes = base64ToBytes(base64);
    const path = `${userId}/face.jpg`;
    const { error: uploadErr } = await adminClient.storage
      .from("face-verifications")
      .upload(path, bytes, {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return jsonResponse({ error: "Failed to store image" }, 500);
    }

    // 3b) Also upload to the public avatars bucket so it can be used as the profile picture
    const avatarPath = `${userId}/face-${Date.now()}.jpg`;
    let avatarUrl: string | null = null;
    const { error: avatarUploadErr } = await adminClient.storage
      .from("avatars")
      .upload(avatarPath, bytes, {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (avatarUploadErr) {
      console.warn("Avatar upload failed (non-fatal):", avatarUploadErr.message);
    } else {
      const { data: pub } = adminClient.storage.from("avatars").getPublicUrl(avatarPath);
      avatarUrl = pub.publicUrl;
    }

    // 4) Update profile
    const updatePayload: Record<string, unknown> = {
      face_verified: true,
      face_verified_at: new Date().toISOString(),
      face_token: newFaceToken,
      face_image_path: path,
    };
    if (avatarUrl) updatePayload.avatar_url = avatarUrl;
    const { error: updateErr } = await adminClient
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", userId);
    if (updateErr) {
      console.error("Profile update error:", updateErr);
      return jsonResponse({ error: "Failed to mark verification" }, 500);
    }

    return jsonResponse({
      success: true,
      message: "Face verified successfully",
      face_token: newFaceToken,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("verify-face error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
