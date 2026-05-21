// AI Assistant edge function: streams chat with tool-calling to find nearby workers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are NearKonnect's worker-finding assistant.
- Only discuss worker/service-provider search, nearby workers, worker categories, worker availability, distance, ratings, and contact guidance.
- If the user asks about anything unrelated to finding workers, politely say you can only help find nearby workers.
- Keep answers short, direct, and in the user's language.
- Nearby means strictly within 3 km only. Never request or show workers farther than 3 km.
- When a user describes a problem ("AC se pani aa raha hai", "I need an electrician", "geyser kharab"), CALL the find_workers tool to recommend professionals within 3 km. Infer main_category and sub_category from the problem if possible (e.g. plumber, electrician, AC technician, mason, carpenter, painter, mechanic, tutor, etc.). If the user did not share location, ask once to enable location, then call the tool with whatever location context is available.
- If no workers are found within 3 km, say no nearby workers were found within 3 km. Do not suggest farther workers.
- After find_workers returns, briefly summarize the top matches in 1-2 lines — the UI will render the worker cards. Do NOT repeat all details in text.
- Never invent workers. Only mention what the tool returns.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "find_workers",
      description:
        "Find best nearby workers for a user's described problem. Returns ranked list of professionals with distance, rating, contact.",
      parameters: {
        type: "object",
        properties: {
          problem_description: {
            type: "string",
            description: "Short summary of the user's problem in their own words.",
          },
          main_category: {
            type: "string",
            description:
              "Inferred main category (e.g. Plumbing, Electrical, AC, Carpentry, Painting, Cleaning, Tutoring, Mechanic). Optional.",
          },
          sub_category: {
            type: "string",
            description: "More specific sub-category if obvious. Optional.",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Relevant expertise tags / keywords. Optional.",
          },
          max_distance_km: {
            type: "number",
            description: "Search radius in km. Always 3 km or less. Default 3.",
          },
          limit: {
            type: "number",
            description: "How many workers to return. Default 5, max 10.",
          },
        },
        required: ["problem_description"],
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const {
      messages = [],
      conversationId: convIdInput,
      userLat,
      userLon,
      userCity,
    } = body as {
      messages: { role: string; content: string }[];
      conversationId?: string;
      userLat?: number;
      userLon?: number;
      userCity?: string;
    };

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Ensure conversation
    let conversationId = convIdInput;
    if (!conversationId) {
      const first = messages.find((m) => m.role === "user")?.content ?? "New conversation";
      const { data: conv, error: convErr } = await admin
        .from("chatbot_conversations")
        .insert({ user_id: userId, title: first.slice(0, 60) })
        .select("id")
        .single();
      if (convErr) throw convErr;
      conversationId = conv.id;
    }

    // Persist latest user msg
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      await admin.from("chatbot_messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: lastUser.content,
      });
    }

    const sysContext = `${SYSTEM_PROMPT}

User context:
- userId: ${userId}
- approxLocation: ${userLat && userLon ? `${userLat.toFixed(4)}, ${userLon.toFixed(4)}` : "unknown"}
- city: ${userCity ?? "unknown"}
- currentTime: ${new Date().toISOString()}`;

    const callGateway = async (msgs: any[]) =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: msgs,
          tools: TOOLS,
          stream: true,
        }),
      });

    let convoMsgs: any[] = [
      { role: "system", content: sysContext },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let aiResp = await callGateway(convoMsgs);

    if (!aiResp.ok || !aiResp.body) {
      const status = aiResp.status;
      const txt = await aiResp.text();
      console.error("AI gateway error", status, txt);
      const msg =
        status === 429
          ? "Rate limit exceeded, please try again later."
          : status === 402
          ? "AI credits exhausted. Please add funds in Settings."
          : "AI gateway error";
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        send({ type: "conversation", conversationId });

        // We need to support 1 round of tool calling. Loop max 2 times.
        let assistantText = "";
        let toolMetadata: any = null;

        for (let round = 0; round < 2; round++) {
          const reader = aiResp.body!.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let toolCallName: string | null = null;
          let toolCallArgs = "";
          let toolCallId: string | null = null;
          let textThisRound = "";
          let done = false;

          while (!done) {
            const { value, done: rDone } = await reader.read();
            if (rDone) break;
            buf += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buf.indexOf("\n")) !== -1) {
              let line = buf.slice(0, nl);
              buf = buf.slice(nl + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") {
                done = true;
                break;
              }
              try {
                const j = JSON.parse(payload);
                const delta = j.choices?.[0]?.delta;
                if (!delta) continue;
                if (delta.content) {
                  textThisRound += delta.content;
                  send({ type: "delta", content: delta.content });
                }
                const tc = delta.tool_calls?.[0];
                if (tc) {
                  if (tc.id) toolCallId = tc.id;
                  if (tc.function?.name) toolCallName = tc.function.name;
                  if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
                }
              } catch {
                buf = line + "\n" + buf;
                break;
              }
            }
          }

          assistantText += textThisRound;

          if (!toolCallName) break; // no tool requested, finish

          // Execute tool
          let toolResult: any = { error: "Unknown tool" };
          if (toolCallName === "find_workers") {
            let args: any = {};
            try {
              args = JSON.parse(toolCallArgs || "{}");
            } catch {}
            const radius = Math.min(Math.max(args.max_distance_km ?? 3, 1), 3);
            const limit = Math.min(Math.max(args.limit ?? 5, 1), 10);
            const tags = Array.isArray(args.tags) && args.tags.length ? args.tags : null;
            const { data: workers, error: rpcErr } = await admin.rpc(
              "match_workers_for_query",
              {
                p_lat: userLat ?? null,
                p_lon: userLon ?? null,
                p_radius_km: radius,
                p_main_category: args.main_category ?? null,
                p_sub_category: args.sub_category ?? null,
                p_tags: tags,
                p_limit: limit,
              }
            );
            if (rpcErr) {
              console.error("RPC error", rpcErr);
              toolResult = { error: rpcErr.message };
            } else {
              toolResult = { workers: workers ?? [] };
              toolMetadata = {
                tool: "find_workers",
                query: args,
                workers: workers ?? [],
              };
              send({ type: "workers", workers: workers ?? [] });
            }
          }

          // Continue with assistant tool reply
          convoMsgs = [
            ...convoMsgs,
            {
              role: "assistant",
              content: textThisRound || null,
              tool_calls: [
                {
                  id: toolCallId ?? "call_1",
                  type: "function",
                  function: {
                    name: toolCallName,
                    arguments: toolCallArgs,
                  },
                },
              ],
            },
            {
              role: "tool",
              tool_call_id: toolCallId ?? "call_1",
              content: JSON.stringify(toolResult),
            },
          ];

          aiResp = await callGateway(convoMsgs);
          if (!aiResp.ok || !aiResp.body) {
            send({ type: "error", message: "Failed to follow up after tool call." });
            break;
          }
        }

        // Persist assistant
        try {
          await admin.from("chatbot_messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: assistantText,
            metadata: toolMetadata ?? {},
          });
        } catch (e) {
          console.error("persist assistant failed", e);
        }

        send({ type: "done" });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
