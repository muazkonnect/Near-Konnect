import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

function json(status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
  });
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  const out: ChatMessage[] = [];
  for (const raw of input.slice(-20)) {
    const role = (raw as any)?.role;
    const content = (raw as any)?.content;
    if ((role === "user" || role === "assistant" || role === "system") && typeof content === "string") {
      const trimmed = content.trim();
      if (trimmed) out.push({ role, content: trimmed.slice(0, 4000) });
    }
  }
  return out;
}

function normalizeCoords(input: unknown): { latitude: number; longitude: number } | null {
  const lat = Number((input as any)?.latitude);
  const lon = Number((input as any)?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { latitude: lat, longitude: lon };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase env vars are not configured");
    }

    const token = getBearerToken(req);
    if (!token) return json(401, { error: "Missing Authorization bearer token" });

    const payload = await req.json().catch(() => ({}));
    const messages = normalizeMessages((payload as any)?.messages);
    const userCoords = normalizeCoords((payload as any)?.userCoords);
    if (messages.length === 0) return json(400, { error: "messages is required" });

    // Fetch available workers with profiles and average ratings
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return json(401, { error: "Invalid or expired token" });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: workers } = await supabase
      .from("workers")
      .select("id, profession, experience, city, latitude, longitude, user_id, profiles!workers_user_id_fkey_profiles(full_name, avatar_url)")
      .eq("available", true)
      .limit(50);

    // Fetch reviews for rating calculation
    const workerIds = (workers || []).map((w: any) => w.id);
    let ratingsMap: Record<string, { avg: number; count: number }> = {};

    if (workerIds.length > 0) {
      const { data: reviews } = await supabase
        .from("reviews")
        .select("worker_id, rating")
        .in("worker_id", workerIds);

      if (reviews) {
        const grouped: Record<string, number[]> = {};
        for (const r of reviews) {
          if (!grouped[r.worker_id]) grouped[r.worker_id] = [];
          grouped[r.worker_id].push(r.rating);
        }
        for (const [wid, ratings] of Object.entries(grouped)) {
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          ratingsMap[wid] = { avg: Math.round(avg * 10) / 10, count: ratings.length };
        }
      }
    }

    // Build worker context for AI
    const workerList = (workers || []).map((w: any) => {
      const rating = ratingsMap[w.id];
      const profile = w.profiles;
      let distanceStr = "";
      if (userCoords && w.latitude && w.longitude) {
        const dist = haversine(userCoords.latitude, userCoords.longitude, w.latitude, w.longitude);
        distanceStr = ` | Distance: ${dist.toFixed(1)} km`;
      }
      return `- ${profile?.full_name || "Unknown"} | ${w.profession} | ${w.experience}yr exp | ${w.city || "N/A"} | Rating: ${rating ? `${rating.avg}/5 (${rating.count} reviews)` : "No reviews"}${distanceStr} | Profile: /worker/${w.user_id}`;
    }).join("\n");

    const systemPrompt = `You are a helpful support assistant for Near Connect, a platform connecting customers with skilled service workers (plumbers, electricians, painters, etc).

Your job:
1. Help users troubleshoot common household/service problems with practical advice.
2. When relevant, recommend the best-rated available workers for their specific need.
3. Be friendly, concise, and practical.

Available workers on the platform:
${workerList || "No workers currently available."}

When recommending workers:
- Prioritize by relevance to the problem, then by rating, then by proximity.
- Mention the worker's name, profession, rating, and distance if available.
- Always include BOTH links for each recommendation: [View Profile](/worker/USER_ID) and [Message](/messages?to=USER_ID)
- Recommend 1-3 workers max.

If the user's problem is something they can fix themselves, provide DIY steps first, then offer to recommend a professional if they need one.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const body = await response.text();
      if (status === 429) return json(429, { error: "Rate limit exceeded. Please try again shortly." });
      if (status === 402) return json(402, { error: "AI credits exhausted. Please add funds." });
      console.error("AI gateway error:", status, body);
      return json(500, { error: "AI service error" });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chat error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
