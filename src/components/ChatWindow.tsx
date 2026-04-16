import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowLeft, CheckCircle2, FileText, Paperclip, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  otherUserId: string;
  otherUserName: string;
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

const ChatWindow = ({ otherUserId, otherUserName, backLink }: Props) => {
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

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 p-4 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link to={backLink} className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-card-foreground">{otherUserName}</h3>
              <p className="text-xs text-success">Live chat active</p>
            </div>
          </div>
        </div>
        <div className="mt-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Service Summary</p>
          <p>Discuss scope, share timeline, then confirm booking in one tap.</p>
          <div className="mt-2 flex gap-2">
            <button className="tap-feedback inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground">
              <FileText className="h-3 w-3" /> Send Offer
            </button>
            <button className="tap-feedback inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground">
              <CheckCircle2 className="h-3 w-3" /> Confirm Booking
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {hasOlder && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" className="rounded-full" onClick={loadOlderMessages} disabled={loadingOlder}>
              {loadingOlder ? "Loading..." : "Load older messages"}
            </Button>
          </div>
        )}

        {isLoading && messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Loading chat...</p>
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
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  isMine
                    ? isFailed
                      ? "bg-destructive/15 text-foreground rounded-br-md border border-destructive/30"
                      : "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p>{msg.message_text}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {isMine && <span className="ml-1">· {msg.status === "failed" ? "failed" : msg.status}</span>}
                </p>
                {isMine && isFailed && (
                  <button
                    type="button"
                    className="mt-1 text-[11px] font-semibold text-destructive underline"
                    onClick={() => handleRetry(msg)}
                    disabled={retryingId === msg.id}
                  >
                    {retryingId === msg.id ? "Retrying..." : "Retry"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!isLoading && messages.length === 0 && !error && (
          <p className="text-center text-sm text-muted-foreground py-8">Start a conversation</p>
        )}
      </div>

      <div className="sticky bottom-0 p-3 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Button type="button" variant="outline" size="icon" className="rounded-xl">
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 rounded-xl"
          />
          <Button type="submit" size="icon" className="rounded-xl" disabled={!text.trim() || sending}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
