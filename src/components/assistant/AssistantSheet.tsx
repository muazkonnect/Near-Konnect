import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Sparkles, Loader2, MapPin, Star, BadgeCheck, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Msg = {
  role: "user" | "assistant";
  content: string;
  workers?: WorkerCard[];
};

type WorkerCard = {
  id: string;
  user_id: string;
  uid?: string | null;
  full_name: string;
  avatar_url?: string | null;
  profession: string;
  experience: number;
  verified: boolean;
  city?: string | null;
  distance_km?: number | null;
  avg_rating?: number | null;
  review_count?: number | null;
  is_featured?: boolean | null;
};

const QUICK = [
  "Mujhe plumber chahiye",
  "AC se pani tap raha hai",
  "Electrician near me",
  "Ad kaise post karun?",
  "Profile verify kaise hogi?",
];

export default function AssistantSheet() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! Main NearKonnect ka assistant hun. Apni problem batao ya app k baray mein kuch puchho — main nearest best worker dhoondh k dunga.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || coords) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
    );
  }, [open, coords]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || loading) return;
    if (!user || !session) {
      toast({ title: "Login required", description: "Pehle login karein assistant use karne ke liye." });
      navigate("/login");
      return;
    }
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: value }];
    setMessages(next);
    setLoading(true);

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          conversationId,
          userLat: coords?.lat,
          userLon: coords?.lon,
        }),
      });
      if (!resp.ok || !resp.body) {
        let msg = "Assistant unavailable";
        try {
          const j = await resp.json();
          msg = j.error ?? msg;
        } catch {}
        toast({ title: "Error", description: msg, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Add empty assistant message to fill in
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantText = "";
      let workers: WorkerCard[] | undefined;
      let streamDone = false;

      while (!streamDone) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(chunk, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const j = JSON.parse(payload);
            if (j.type === "conversation" && j.conversationId) {
              setConversationId(j.conversationId);
            } else if (j.type === "delta" && j.content) {
              assistantText += j.content;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = { ...last, content: assistantText };
                }
                return copy;
              });
            } else if (j.type === "workers") {
              workers = j.workers;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = { ...last, workers };
                }
                return copy;
              });
            } else if (j.type === "done") {
              streamDone = true;
            } else if (j.type === "error") {
              toast({ title: "Assistant error", description: j.message, variant: "destructive" });
            }
          } catch {
            // partial JSON, put back
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Network error", description: "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const placeholder = useMemo(
    () => "Apni problem batayein ya sawal puchein…",
    []
  );

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className="fixed bottom-20 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-500 text-primary-foreground shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.6)] ring-2 ring-amber-300/40 transition active:scale-95 md:bottom-6"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[88vh] rounded-t-3xl p-0">
          <SheetHeader className="border-b px-5 py-3">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bot className="h-5 w-5 text-primary" /> NearKonnect Assistant
            </SheetTitle>
          </SheetHeader>

          <div ref={scrollRef} className="h-[calc(88vh-160px)] overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} onOpenWorker={(id) => { setOpen(false); navigate(`/worker/${id}`); }} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Sochne mein…
              </div>
            )}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t bg-background px-4 py-3 flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

function MessageBubble({ msg, onOpenWorker }: { msg: Msg; onOpenWorker: (id: string) => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border rounded-bl-sm"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1">
            <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
          </div>
        )}
        {msg.workers && msg.workers.length > 0 && (
          <div className="mt-3 grid gap-2">
            {msg.workers.map((w) => (
              <button
                key={w.id}
                onClick={() => onOpenWorker(w.id)}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5 text-left hover:bg-accent transition"
              >
                <Avatar className="h-12 w-12 rounded-xl">
                  <AvatarImage src={w.avatar_url ?? undefined} alt={w.full_name} />
                  <AvatarFallback className="rounded-xl text-xs">
                    {w.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-sm font-semibold">{w.full_name || "Worker"}</span>
                    {w.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                    {w.is_featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {w.profession} • {w.experience}y exp
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {typeof w.distance_km === "number" && (
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {w.distance_km.toFixed(1)} km
                      </span>
                    )}
                    {!!w.review_count && (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {Number(w.avg_rating ?? 0).toFixed(1)} ({w.review_count})
                      </span>
                    )}
                  </div>
                </div>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
