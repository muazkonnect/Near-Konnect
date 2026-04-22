import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { MessageSquare, Search, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import { fetchConversationSummaries } from "@/lib/messages";
import { markRead } from "@/hooks/useNotifications";

const Messages = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    const to = searchParams.get("to");
    if (to && user) navigate(`/chat/${to}`, { replace: true });
  }, [searchParams, user, navigate]);

  useEffect(() => {
    markRead((n) => n.type === "message");
  }, []);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => fetchConversationSummaries(user!.id),
    enabled: !!user,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  const { data: pendingReveals = [] } = useQuery({
    queryKey: ["pending_reveals_inbox", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contact_reveals")
        .select("client_user_id")
        .eq("worker_user_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      return (data || []).map((r: any) => r.client_user_id as string);
    },
    enabled: !!user,
    staleTime: 15_000,
  });
  const pendingSet = useMemo(() => new Set(pendingReveals), [pendingReveals]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-list-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload: any) => {
          const m = payload.new || payload.old;
          if (!m) return;
          if (m.sender_id === user.id || m.receiver_id === user.id) {
            queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_reveals" },
        (payload: any) => {
          const r = payload.new || payload.old;
          if (!r) return;
          if (r.worker_user_id === user.id) {
            queryClient.invalidateQueries({ queryKey: ["pending_reveals_inbox", user.id] });
          }
        },
      );
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c: any) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
  }, [conversations, search]);

  if (loading) return null;

  return (
    <AppLayout title="Messages" subtitle="Chat with nearby helpers and confirm work quickly.">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations..." className="h-12 rounded-full border-none bg-muted pl-11" />
        </div>

        {filteredConversations.length === 0 ? (
          <div className="rounded-3xl bg-muted/40 py-16 text-center">
            <MessageSquare className="mx-auto mb-2 h-9 w-9 text-muted-foreground" />
            <p className="font-bold text-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground">Start by messaging a service from Explore.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((c: any) => (
              <Link
                key={c.userId}
                to={`/chat/${c.userId}`}
                className="tap-feedback flex items-center gap-4 rounded-2xl bg-card p-4 transition-all hover:bg-muted"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-hero text-sm font-bold text-primary">
                  {c.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-card-foreground">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.lastMessage}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(c.time).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Messages;
