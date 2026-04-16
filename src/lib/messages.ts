import { supabase } from "@/integrations/supabase/client";

export type ConversationSummary = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  lastMessage: string;
  time: string;
  status: string;
};

export async function fetchConversationSummaries(userId: string): Promise<ConversationSummary[]> {
  const { data: msgs, error } = await supabase
    .from("messages")
    .select("sender_id, receiver_id, message_text, created_at, status")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  const latestByUser = new Map<string, { lastMessage: string; time: string; status: string }>();
  for (const m of msgs || []) {
    const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    if (!otherId || latestByUser.has(otherId)) continue;
    latestByUser.set(otherId, {
      lastMessage: m.message_text || "",
      time: m.created_at,
      status: m.status || "sent",
    });
  }

  const ids = Array.from(latestByUser.keys());
  if (!ids.length) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url")
    .in("user_id", ids);

  if (profileError) throw profileError;

  const profileByUserId = new Map(
    (profiles || []).map((profile) => [profile.user_id, profile]),
  );

  return ids.map((id) => {
    const p = profileByUserId.get(id);
    const info = latestByUser.get(id)!;

    return {
      userId: id,
      name: p?.full_name || "Unknown",
      avatarUrl: p?.avatar_url,
      lastMessage: info.lastMessage,
      time: info.time,
      status: info.status,
    };
  });
}