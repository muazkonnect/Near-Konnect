import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Plus, Send, MoreVertical, Phone, Video, CheckCheck, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string | null;
  backLink: string;
}

const PAGE_SIZE = 30;

type ChatMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  created_at: string;
  status: "sent" | "delivered" | "seen" | "failed";
};

const formatDateLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return "Today";
  if (same(d, yest)) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
};

const ChatWindow = ({ otherUserId, otherUserName, otherUserAvatar, backLink }: Props) => {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const conversationFilter = useMemo(
    () => `and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`,
    [user?.id, otherUserId],
  );

  const { data: initialMessages = [], isLoading, error, refetch } = useQuery({
    queryKey: ["messages", user?.id, otherUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(conversationFilter)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      return (data || []).reverse() as ChatMessage[];
    },
    enabled: !!user && !!otherUserId,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    setMessages(initialMessages);
    setHasOlder(initialMessages.length >= PAGE_SIZE);
  }, [initialMessages]);

  useEffect(() => {
    if (!user) return;

    const channelName = `chat-${user.id}-${otherUserId}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const msg = payload.new as ChatMessage;
        const relevant =
          (msg.sender_id === user.id && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === user.id);

        if (!relevant) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
      },
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages" },
      (payload) => {
        const msg = payload.new as ChatMessage;
        const relevant =
          (msg.sender_id === user.id && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === user.id);

        if (!relevant) return;

        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
      },
    );

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        refetch();
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherUserId, queryClient, refetch]);

  useEffect(() => {
    if (!loadingOlder) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loadingOlder]);

  useEffect(() => {
    if (!user || !messages.length) return;
    const unseenIds = messages
      .filter((m) => m.receiver_id === user.id && m.status !== "seen" && !m.id.startsWith("temp-"))
      .map((m) => m.id);

    if (unseenIds.length === 0) return;

    supabase
      .from("messages")
      .update({ status: "seen" })
      .in("id", unseenIds)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
      });
  }, [messages, user, queryClient]);

  const sendMessage = async (messageText: string, tempId?: string) => {
    if (!user) return;
    const trimmed = messageText.trim();
    if (!trimmed) return;

    const optimisticId = tempId || `temp-${Date.now()}`;

    if (!tempId) {
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          sender_id: user.id,
          receiver_id: otherUserId,
          message_text: trimmed,
          created_at: new Date().toISOString(),
          status: "sent",
        },
      ]);
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: otherUserId,
        message_text: trimmed,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, status: "failed" } : m)),
      );
      throw error || new Error("Message failed to send");
    }

    setMessages((prev) => prev.map((m) => (m.id === optimisticId ? (data as ChatMessage) : m)));
    queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
  };

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    const draft = text;
    setText("");
    setSending(true);
    try {
      await sendMessage(draft);
    } catch {
      toast.error("Message failed. Tap retry to send again.");
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (failedMessage: ChatMessage) => {
    if (retryingId) return;
    setRetryingId(failedMessage.id);
    try {
      await sendMessage(failedMessage.message_text, failedMessage.id);
    } catch {
      toast.error("Retry failed. Please try again.");
    } finally {
      setRetryingId(null);
    }
  };

  const loadOlderMessages = async () => {
    if (!user || !hasOlder || loadingOlder || messages.length === 0) return;

    setLoadingOlder(true);
    const oldest = messages[0]?.created_at;
    const prevHeight = scrollRef.current?.scrollHeight || 0;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(conversationFilter)
      .lt("created_at", oldest)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (!error && data?.length) {
      const nextChunk = [...data].reverse() as ChatMessage[];
      setMessages((prev) => [...nextChunk, ...prev]);
      setHasOlder(data.length >= PAGE_SIZE);
      setTimeout(() => {
        if (scrollRef.current) {
          const nextHeight = scrollRef.current.scrollHeight;
          scrollRef.current.scrollTop = nextHeight - prevHeight;
        }
      }, 0);
    } else if (!error) {
      setHasOlder(false);
    }

    setLoadingOlder(false);
  };

  const initials = (otherUserName || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Group messages by date for separators
  let lastDateKey = "";

  return (
    <div className="flex h-full flex-col bg-hero text-hero-foreground">
      {/* Top App Bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-hero-foreground/10 bg-hero/80 px-4 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={backLink}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-hero-foreground transition hover:bg-hero-foreground/10"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 border border-hero-foreground/15">
              <AvatarImage src={otherUserAvatar || undefined} alt={otherUserName} />
              <AvatarFallback className="bg-hero-foreground/10 text-xs font-bold text-hero-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-primary ring-2 ring-hero" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-sora text-sm font-bold tracking-tight">{otherUserName}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-hero-foreground/70 transition hover:bg-hero-foreground/10 hover:text-hero-foreground"
            aria-label="Voice call"
            type="button"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-hero-foreground/70 transition hover:bg-hero-foreground/10 hover:text-hero-foreground"
            aria-label="Video call"
            type="button"
          >
            <Video className="h-4 w-4" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-hero-foreground/70 transition hover:bg-hero-foreground/10 hover:text-hero-foreground"
            aria-label="More"
            type="button"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-2"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--hero-foreground)/0.04) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {hasOlder && (
          <div className="flex justify-center pb-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-hero-foreground/15 bg-hero-foreground/5 text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground"
              onClick={loadOlderMessages}
              disabled={loadingOlder}
            >
              {loadingOlder ? "Loading..." : "Load older messages"}
            </Button>
          </div>
        )}

        {isLoading && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-hero-foreground/60">Loading chat...</p>
        )}

        {error && messages.length === 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center">
            <p className="text-sm text-destructive">Failed to load messages.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          const isFailed = msg.status === "failed";
          const dateKey = new Date(msg.created_at).toDateString();
          const showDate = dateKey !== lastDateKey;
          lastDateKey = dateKey;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-hero-foreground/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-hero-foreground/50">
                    {formatDateLabel(msg.created_at)}
                  </span>
                </div>
              )}

              <div className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[85%] flex-col gap-1 md:max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
                  <div
                    className={`px-4 py-2.5 text-sm leading-snug shadow-sm ${
                      isMine
                        ? isFailed
                          ? "rounded-2xl rounded-br-md border border-destructive/30 bg-destructive/15 text-hero-foreground"
                          : "rounded-2xl rounded-br-md border border-primary/30 bg-primary/15 text-hero-foreground shadow-[0_0_18px_-8px_hsl(var(--primary)/0.6)]"
                        : "rounded-2xl rounded-bl-md border border-hero-foreground/10 bg-hero-foreground/[0.06] text-hero-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>
                  </div>

                  <div className="flex items-center gap-1 px-1">
                    <span className="text-[10px] text-hero-foreground/40">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isMine && !isFailed && (
                      msg.status === "seen" ? (
                        <CheckCheck className="h-3 w-3 text-primary" />
                      ) : (
                        <Check className="h-3 w-3 text-hero-foreground/40" />
                      )
                    )}
                    {isMine && isFailed && (
                      <button
                        type="button"
                        className="text-[10px] font-semibold text-destructive underline"
                        onClick={() => handleRetry(msg)}
                        disabled={retryingId === msg.id}
                      >
                        {retryingId === msg.id ? "Retrying..." : "Retry"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!isLoading && messages.length === 0 && !error && (
          <p className="py-8 text-center text-sm text-hero-foreground/60">Start a conversation</p>
        )}
      </div>

      {/* Bottom Input */}
      <div className="sticky bottom-0 z-20 border-t border-hero-foreground/10 bg-hero/80 px-4 py-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-hero-foreground/70 transition hover:bg-hero-foreground/10 hover:text-hero-foreground"
            aria-label="Attach"
          >
            <Plus className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
            <Input
              placeholder="Type your message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="h-11 rounded-xl border border-hero-foreground/10 bg-hero-foreground/5 px-4 text-sm text-hero-foreground placeholder:text-hero-foreground/40 focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)] transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            aria-label="Send"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
