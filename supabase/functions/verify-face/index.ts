// Face verification using face-api.js descriptors (computed in the browser).
// - Validates the caller's JWT
// - Accepts a base64 image (data URL or raw) + a 128-d descriptor
// - Checks no other account has a matching descriptor
// - If the user already has a stored descriptor, requires it to match
// - Stores image (private + public avatar) and updates the profile

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FACE_MATCH_THRESHOLD = 0.55;
const SAME_USER_MATCH_THRESHOLD = 0.6;

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

function distance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const descriptor = Array.isArray(body?.descriptor) ? body.descriptor as number[] : null;
    if (!image) return jsonResponse({ error: "Missing image" }, 400);
    if (!descriptor || descriptor.length !== 128 || !descriptor.every((n) => typeof n === "number" && Number.isFinite(n))) {
      return jsonResponse({ error: "Missing or invalid face descriptor" }, 400);
    }

    const base64 = stripDataUrl(image);
    if (base64.length < 1000) return jsonResponse({ error: "Image is too small" }, 400);
    if (base64.length > 7_000_000) return jsonResponse({ error: "Image is too large (max ~5MB)" }, 400);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user already has a descriptor — if so it must still match.
    const { data: profile } = await adminClient
      .from("profiles")
      .select("face_descriptor")
      .eq("user_id", userId)
      .maybeSingle();

    const stored = (profile?.face_descriptor ?? null) as number[] | null;
    if (stored && stored.length === 128) {
      if (distance(descriptor, stored) > SAME_USER_MATCH_THRESHOLD) {
        return jsonResponse({
          error: "Face does not match the previously verified photo for this account.",
        }, 422);
      }
    }

    // Duplicate check: scan all OTHER users' descriptors.
    const { data: rows, error: rowsErr } = await adminClient
      .from("profiles")
      .select("user_id, face_descriptor")
      .neq("user_id", userId)
      .not("face_descriptor", "is", null);
    if (rowsErr) throw rowsErr;

    for (const row of rows ?? []) {
      const other = row.face_descriptor as number[] | null;
      if (!other || other.length !== 128) continue;
      if (distance(descriptor, other) < FACE_MATCH_THRESHOLD) {
        return jsonResponse({
          error: "This face is already registered with another account. Only one account per person is allowed.",
          code: "duplicate_face",
        }, 409);
      }
    }

    // Upload image to private bucket
    const bytes = base64ToBytes(base64);
    const path = `${userId}/face.jpg`;
    const { error: uploadErr } = await adminClient.storage
      .from("face-verifications")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return jsonResponse({ error: "Failed to store image" }, 500);
    }

    // Also upload to public avatars
    const avatarPath = `${userId}/face-${Date.now()}.jpg`;
    let avatarUrl: string | null = null;
    const { error: avatarErr } = await adminClient.storage
      .from("avatars")
      .upload(avatarPath, bytes, { contentType: "image/jpeg", upsert: true });
    if (avatarErr) {
      console.warn("Avatar upload failed (non-fatal):", avatarErr.message);
    } else {
      const { data: pub } = adminClient.storage.from("avatars").getPublicUrl(avatarPath);
      avatarUrl = pub.publicUrl;
    }

    const updatePayload: Record<string, unknown> = {
      face_verified: true,
      face_verified_at: new Date().toISOString(),
      face_descriptor: descriptor,
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

    return jsonResponse({ success: true, message: "Face verified successfully" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("verify-face error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
