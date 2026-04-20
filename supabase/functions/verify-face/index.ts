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

    // 2) Compare against stored face if present (same-user re-verification)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("face_token")
      .eq("user_id", userId)
      .maybeSingle();

    let needsEnrollmentDedupCheck = !profile?.face_token;

    if (profile?.face_token) {
      const compareForm = new FormData();
      compareForm.append("face_token1", profile.face_token);
      compareForm.append("face_token2", newFaceToken);
      try {
        const compare = await faceppCall("compare", compareForm);
        const confidence: number = compare.confidence ?? 0;
        const threshold: number =
          compare.thresholds?.["1e-5"] ?? DUP_CONFIDENCE_FALLBACK;
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
        // Stored token expired (~72h) — re-enroll AND re-check for duplicates.
        console.warn("Compare failed, re-enrolling:", (e as Error).message);
        needsEnrollmentDedupCheck = true;
      }
    }

    // 2b) Duplicate-face check: first search the global FaceSet, then fall back
    // to direct image-vs-image compares against verified stored face photos.
    if (needsEnrollmentDedupCheck) {
      const duplicateError = {
        error:
          "This face is already registered with another account. Only one account per person is allowed.",
        code: "duplicate_face",
      };
      let faceSetTokens: string[] = [];
      try {
        const searchForm = new FormData();
        searchForm.append("face_token", newFaceToken);
        searchForm.append("outer_id", FACESET_OUTER_ID);
        searchForm.append("return_result_count", "10");
        const search = await faceppCall("search", searchForm);
        const results = (search.results ?? []) as Array<{ face_token: string; confidence: number }>;
        const thresholds = (search.thresholds ?? {}) as Record<string, number>;
        const threshold = thresholds["1e-5"] ?? DUP_CONFIDENCE_FALLBACK;
        faceSetTokens = results.filter((r) => r.confidence >= threshold).map((r) => r.face_token);
      } catch (e) {
        const msg = (e as Error).message;
        if (/INVALID_OUTER_ID|FACESET_NOT_FOUND|outer_id/i.test(msg)) {
          const createForm = new FormData();
          createForm.append("outer_id", FACESET_OUTER_ID);
          createForm.append("display_name", "NearKonnect Users");
          try { await faceppCall("faceset/create", createForm); } catch (ce) {
            console.warn("FaceSet create failed:", (ce as Error).message);
          }
        } else {
          console.warn("FaceSet search failed (non-fatal):", msg);
        }
      }

      if (faceSetTokens.length > 0) {
        const { data: owners } = await adminClient
          .from("profiles")
          .select("user_id, face_token")
          .in("face_token", faceSetTokens);
        const conflict = (owners ?? []).find((o) => o.user_id !== userId);
        if (conflict) {
          return jsonResponse(duplicateError, 409);
        }
      }

      const bytesToBase64 = (bytes: Uint8Array) => {
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
      };

      const { data: candidates } = await adminClient
        .from("profiles")
        .select("user_id, face_image_path, face_verified_at")
        .eq("face_verified", true)
        .not("face_image_path", "is", null)
        .neq("user_id", userId)
        .order("face_verified_at", { ascending: false })
        .limit(50);

      for (const candidate of candidates ?? []) {
        if (!candidate.face_image_path) continue;
        try {
          const { data: file, error: downloadErr } = await adminClient.storage
            .from("face-verifications")
            .download(candidate.face_image_path);
          if (downloadErr || !file) continue;

          const storedBytes = new Uint8Array(await file.arrayBuffer());
          const storedBase64 = bytesToBase64(storedBytes);
          const compareForm = new FormData();
          compareForm.append("image_base64_1", base64);
          compareForm.append("image_base64_2", storedBase64);
          const compare = await faceppCall("compare", compareForm);
          const confidence: number = compare.confidence ?? 0;
          const threshold: number = compare.thresholds?.["1e-5"] ?? DUP_CONFIDENCE_FALLBACK;
          if (confidence >= threshold) {
            return jsonResponse(duplicateError, 409);
          }
        } catch (err) {
          console.warn("Fallback duplicate compare skipped:", (err as Error).message);
        }
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

    // 5) Add this token to the global FaceSet so future signups can be
    // deduplicated against it. Best-effort — never fail the request on this.
    const addToFaceSet = async () => {
      const addForm = new FormData();
      addForm.append("outer_id", FACESET_OUTER_ID);
      addForm.append("face_tokens", newFaceToken);
      await faceppCall("faceset/addface", addForm);
    };
    try {
      await addToFaceSet();
    } catch (e) {
      const msg = (e as Error).message;
      if (/INVALID_OUTER_ID|FACESET_NOT_FOUND|outer_id/i.test(msg)) {
        try {
          const createForm = new FormData();
          createForm.append("outer_id", FACESET_OUTER_ID);
          createForm.append("display_name", "NearKonnect Users");
          await faceppCall("faceset/create", createForm);
          await addToFaceSet();
        } catch (retryErr) {
          console.warn("FaceSet add (after create) failed:", (retryErr as Error).message);
        }
      } else {
        console.warn("FaceSet addface failed (non-fatal):", msg);
      }
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
