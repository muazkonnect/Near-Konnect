import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { MessageSquare, Search, Lock, ChevronDown, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { fetchConversationSummaries } from "@/lib/messages";
import { markRead, removeNotification } from "@/hooks/useNotifications";
import { toast } from "sonner";

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
    markRead((n) => n.type === "message" || n.type === "contact_request");
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
        .select("id, client_user_id, request_message, created_at")
        .eq("worker_user_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as Array<{ id: string; client_user_id: string; request_message: string | null; created_at: string }>;
      const ids = Array.from(new Set(rows.map((r) => r.client_user_id)));
      let nameMap: Record<string, { name: string; avatar: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        (profs || []).forEach((p: any) => {
          nameMap[p.user_id] = { name: p.full_name || "User", avatar: p.avatar_url };
        });
      }
      return rows.map((r) => ({ ...r, name: nameMap[r.client_user_id]?.name || "User", avatar: nameMap[r.client_user_id]?.avatar || null }));
    },
    enabled: !!user,
    staleTime: 15_000,
  });
  const pendingSet = useMemo(() => new Set(pendingReveals.map((r: any) => r.client_user_id)), [pendingReveals]);
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyBulk, setBusyBulk] = useState(false);

  const decideOne = async (id: string, approve: boolean) => {
    setBusyId(id);
    const { error } = await (supabase as any)
      .from("contact_reveals")
      .update({ status: approve ? "approved" : "denied", decided_at: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message || "Could not update");
      return;
    }
    removeNotification(`reveal-${id}`);
    toast.success(approve ? "Contact shared" : "Request declined");
    queryClient.invalidateQueries({ queryKey: ["pending_reveals_inbox", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["contact_reveal"] });
  };

  const decideAll = async (approve: boolean) => {
    if (!pendingReveals.length) return;
    setBusyBulk(true);
    const ids = (pendingReveals as any[]).map((r) => r.id);
    const { error } = await (supabase as any)
      .from("contact_reveals")
      .update({ status: approve ? "approved" : "denied", decided_at: new Date().toISOString() })
      .in("id", ids);
    setBusyBulk(false);
    if (error) {
      toast.error(error.message || "Could not update");
      return;
    }
    ids.forEach((id) => removeNotification(`reveal-${id}`));
    toast.success(approve ? "All requests approved" : "All requests declined");
    queryClient.invalidateQueries({ queryKey: ["pending_reveals_inbox", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["contact_reveal"] });
  };

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

  const pendingRevealCount = pendingReveals.length;

  return (
    <AppLayout title="Messages" subtitle="Chat with nearby helpers and confirm work quickly.">
      <div className="space-y-4">
        {pendingRevealCount > 0 && (
          <div className="rounded-2xl border border-primary/30 bg-primary/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setPendingExpanded((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left tap-feedback"
              aria-expanded={pendingExpanded}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {pendingRevealCount} pending contact request{pendingRevealCount === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted-foreground">Tap to review and respond.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">
                  {pendingRevealCount > 9 ? "9+" : pendingRevealCount}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${pendingExpanded ? "rotate-180" : ""}`} />
              </div>
            </button>

            {pendingExpanded && (
              <div className="border-t border-primary/20 bg-background/60">
                <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-primary/10">
                  <Button size="sm" onClick={() => decideAll(true)} disabled={busyBulk}>
                    <Check className="h-3.5 w-3.5" /> Approve all
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => decideAll(false)} disabled={busyBulk}>
                    <X className="h-3.5 w-3.5" /> Decline all
                  </Button>
                </div>
                <ul className="divide-y divide-border/50">
                  {(pendingReveals as any[]).map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <Link to={`/chat/${r.client_user_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-hero text-xs font-bold text-primary overflow-hidden">
                          {r.avatar ? (
                            <img src={r.avatar} alt={r.name} className="h-full w-full object-cover" />
                          ) : (
                            r.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.request_message || "Wants to view your contact"}
                          </p>
                        </div>
                      </Link>
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="icon" className="h-9 w-9" onClick={() => decideOne(r.id, true)} disabled={busyId === r.id}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => decideOne(r.id, false)} disabled={busyId === r.id}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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
            {filteredConversations.map((c: any) => {
              const hasReveal = pendingSet.has(c.userId);
              return (
                <Link
                  key={c.userId}
                  to={`/chat/${c.userId}`}
                  className="tap-feedback flex items-center gap-4 rounded-2xl bg-card p-4 transition-all hover:bg-muted"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-hero text-sm font-bold text-primary">
                    {c.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-card-foreground truncate">{c.name}</p>
                      {hasReveal && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          <Lock className="h-2.5 w-2.5" /> Contact request
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{c.lastMessage}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(c.time).toLocaleDateString()}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Messages;
