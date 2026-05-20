import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { MessageSquare, Search, Lock, ChevronDown, Check, X, Bell, ShieldCheck, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import logoImg from "@/assets/logo.svg";
import { fetchConversationSummaries } from "@/lib/messages";
import { markRead, removeNotification } from "@/hooks/useNotifications";
import { toast } from "sonner";

type TabKey = "all" | "unread" | "archived";

const Messages = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [searchParams] = useSearchParams();

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
    if (error) { toast.error(error.message || "Could not update"); return; }
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
    if (error) { toast.error(error.message || "Could not update"); return; }
    ids.forEach((id) => removeNotification(`reveal-${id}`));
    toast.success(approve ? "All requests approved" : "All requests declined");
    queryClient.invalidateQueries({ queryKey: ["pending_reveals_inbox", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["contact_reveal"] });
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-list-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload: any) => {
        const m = payload.new || payload.old;
        if (!m) return;
        if (m.sender_id === user.id || m.receiver_id === user.id) {
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_reveals" }, (payload: any) => {
        const r = payload.new || payload.old;
        if (!r) return;
        if (r.worker_user_id === user.id) {
          queryClient.invalidateQueries({ queryKey: ["pending_reveals_inbox", user.id] });
        }
      });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const filteredConversations = useMemo(() => {
    let list = conversations as any[];
    if (tab === "unread") list = list.filter((c: any) => c.unread);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c: any) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
    }
    return list;
  }, [conversations, search, tab]);

  if (loading) return null;

  const pendingRevealCount = pendingReveals.length;
  const unreadCount = (conversations as any[]).filter((c: any) => c.unread).length;

  const formatTime = (t: string | number | Date) => {
    const d = new Date(t);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <AppLayout title="Messages" subtitle="Your conversations in one place.">
      <div className="-mx-4 -mt-[90px] -mb-[166px] min-h-screen bg-[#131313] text-[#e5e2e1]">

        <main className="mx-auto max-w-5xl px-6 pt-6 pb-32">


          {/* SEARCH */}
          <section className="mb-8">
            <div className="relative mx-auto w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c4c7c7]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="h-14 w-full rounded-lg border-0 border-b border-[#444748]/30 bg-[#1c1b1b] pl-12 pr-4 text-[#e5e2e1] placeholder:text-[#c4c7c7] focus-visible:ring-0 focus-visible:border-[#d9ff7a]"
              />
            </div>
          </section>

          {/* TABS */}
          <div className="mb-8 flex gap-6 border-b border-[#444748]/20 px-2">
            {([
              { k: "all", label: "All" },
              { k: "unread", label: "Unread" },
              { k: "archived", label: "Archived" },
            ] as { k: TabKey; label: string }[]).map(({ k, label }) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`pb-2 px-1 text-sm font-medium tracking-wide transition-all ${
                  tab === k
                    ? "text-[#d9ff7a] border-b-2 border-[#d9ff7a]"
                    : "text-[#c4c7c7] hover:text-[#e5e2e1]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* PENDING REVEALS */}
          {pendingRevealCount > 0 && (
            <div className="mb-6 overflow-hidden rounded-xl border border-[#d9ff7a]/20 bg-[#d9ff7a]/5">
              <button
                type="button"
                onClick={() => setPendingExpanded((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#d9ff7a] text-[#151f00]">
                    <Lock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#e5e2e1]">
                      {pendingRevealCount} pending contact request{pendingRevealCount === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-[#c4c7c7]">Tap to review and respond.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#d9ff7a] px-2 text-xs font-bold text-[#151f00]">
                    {pendingRevealCount > 9 ? "9+" : pendingRevealCount}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#c4c7c7] transition-transform ${pendingExpanded ? "rotate-180" : ""}`} />
                </div>
              </button>
              {pendingExpanded && (
                <div className="border-t border-[#d9ff7a]/10 bg-[#131313]/60">
                  <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-[#d9ff7a]/10">
                    <Button size="sm" className="bg-[#d9ff7a] text-[#151f00] hover:bg-[#bff51f]" onClick={() => decideAll(true)} disabled={busyBulk}>
                      <Check className="h-3.5 w-3.5" /> Approve all
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => decideAll(false)} disabled={busyBulk}>
                      <X className="h-3.5 w-3.5" /> Decline all
                    </Button>
                  </div>
                  <ul className="divide-y divide-[#444748]/20">
                    {(pendingReveals as any[]).map((r) => (
                      <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                        <Link to={`/chat/${r.client_user_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a2a2a] text-xs font-bold text-[#d9ff7a]">
                            {r.avatar ? (
                              <img src={r.avatar} alt={r.name} className="h-full w-full object-cover" />
                            ) : (
                              r.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#e5e2e1] truncate">{r.name}</p>
                            <p className="text-xs text-[#c4c7c7] truncate">{r.request_message || "Wants to view your contact"}</p>
                          </div>
                        </Link>
                        <div className="flex shrink-0 gap-1.5">
                          <Button size="icon" className="h-9 w-9 bg-[#d9ff7a] text-[#151f00] hover:bg-[#bff51f]" onClick={() => decideOne(r.id, true)} disabled={busyId === r.id}>
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

          {/* CONVERSATIONS */}
          <section className="space-y-2">
            <div className="mb-3 flex items-center justify-between px-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#c4c7c7]">
                Recent Conversations
              </h2>
              {unreadCount > 0 && (
                <span className="text-[12px] font-semibold text-[#d9ff7a]">{unreadCount} Unread</span>
              )}
            </div>

            {!user ? (
              <div className="rounded-xl bg-[#1c1b1b] py-16 text-center">
                <Lock className="mx-auto mb-2 h-9 w-9 text-[#c4c7c7]" />
                <p className="font-semibold text-[#e5e2e1]">Log in to view your messages</p>
                <p className="mt-1 text-sm text-[#c4c7c7]">You can browse the app freely. Sign in to chat.</p>
                <Button className="mt-4 bg-[#d9ff7a] text-[#151f00] hover:bg-[#bff51f]" onClick={() => navigate("/login")}>
                  Log in
                </Button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="rounded-xl bg-[#1c1b1b] py-16 text-center">
                <MessageSquare className="mx-auto mb-2 h-9 w-9 text-[#c4c7c7]" />
                <p className="font-semibold text-[#e5e2e1]">No conversations yet</p>
                <p className="text-sm text-[#c4c7c7]">Start by messaging a service from Explore.</p>
              </div>
            ) : (
              filteredConversations.map((c: any) => {
                const hasReveal = pendingSet.has(c.userId);
                const initials = c.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <Link
                    key={c.userId}
                    to={`/chat/${c.userId}`}
                    className="group flex items-center gap-4 rounded-xl border border-transparent bg-[#1c1b1b] p-4 transition-all duration-300 hover:border-[#444748]/20 hover:bg-[#2a2a2a]"
                  >
                    <div className="relative shrink-0">
                      <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-[#444748]/10">
                        {c.avatar ? (
                          <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#2a2a2a] text-base font-bold text-[#d9ff7a]">
                            {initials}
                          </div>
                        )}
                      </div>
                      <div className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#131313] ${c.unread ? "bg-[#d9ff7a]" : "bg-[#444748]"}`} />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <h3 className="truncate text-[18px] font-semibold text-[#e5e2e1]">{c.name}</h3>
                        <span className="shrink-0 text-[12px] text-[#c4c7c7]">{formatTime(c.time)}</span>
                      </div>
                      {hasReveal && (
                        <p className="mb-1 inline-flex items-center gap-1 text-[13px] font-medium text-[#d9ff7a]/80">
                          <Lock className="h-3 w-3" /> Contact request
                        </p>
                      )}
                      <p className={`truncate text-[15px] ${c.unread ? "font-semibold text-[#e5e2e1]" : "text-[#c4c7c7]"}`}>
                        {c.lastMessage}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {c.unread ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d9ff7a] text-[10px] font-bold text-[#151f00]">
                          {typeof c.unread === "number" ? c.unread : 1}
                        </span>
                      ) : null}
                      <ChevronRight className="h-4 w-4 text-[#c4c7c7] opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </Link>
                );
              })
            )}
          </section>

          {/* SAFETY NOTICE */}
          <section className="mt-8 rounded-xl border border-[#d9ff7a]/10 bg-[#d9ff7a]/5 p-4">
            <div className="flex items-start gap-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#d9ff7a]" />
              <div>
                <h4 className="mb-1 text-sm font-semibold text-[#e5e2e1]">Safe Communications</h4>
                <p className="text-sm text-[#c4c7c7]">
                  Near Konnect protects your privacy. Keep all payments and sensitive info within this chat to stay covered by our Konnect Guarantee.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </AppLayout>
  );
};

export default Messages;
