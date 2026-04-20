// Pre-signup duplicate-face check using face-api.js descriptors.
// The browser computes a 128-d descriptor and posts it here.
// We compare it (Euclidean distance) against every stored descriptor.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// face-api.js recommends 0.6 — we use a slightly stricter threshold.
const FACE_MATCH_THRESHOLD = 0.55;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    const body = await req.json().catch(() => null);
    const descriptor = Array.isArray(body?.descriptor) ? body.descriptor as number[] : null;
    if (!descriptor || descriptor.length !== 128 || !descriptor.every((n) => typeof n === "number" && Number.isFinite(n))) {
      return jsonResponse({ error: "Missing or invalid face descriptor" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: rows, error } = await admin
      .from("profiles")
      .select("user_id, face_descriptor")
      .not("face_descriptor", "is", null);
    if (error) throw error;

    for (const row of rows ?? []) {
      const stored = row.face_descriptor as number[] | null;
      if (!stored || stored.length !== 128) continue;
      if (distance(descriptor, stored) < FACE_MATCH_THRESHOLD) {
        return jsonResponse({
          duplicate: true,
          error: "This face is already registered with another account. Only one account per person is allowed.",
        }, 409);
      }
    }

    return jsonResponse({ duplicate: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("check-face-duplicate error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
