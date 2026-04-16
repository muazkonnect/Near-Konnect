import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Loader2, History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentPosition } from "@/lib/geolocation";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Msg, getGreeting } from "./chatbot/types";
import { streamChat } from "./chatbot/streamChat";
import { useChatHistory } from "./chatbot/useChatHistory";
import ChatMessage from "./chatbot/ChatMessage";
import QuickReplies from "./chatbot/QuickReplies";
import ChatHistory from "./chatbot/ChatHistory";

const SupportChatbot = () => {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasAutoGreeted, setHasAutoGreeted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user } = useAuth();

  const {
    conversations,
    activeConversationId,
    messages,
    setMessages,
    saveMessage,
    loadConversation,
    startNewConversation,
    deleteConversation,
    historyLoaded,
  } = useChatHistory();

  // Get geolocation
  useEffect(() => {
    getCurrentPosition().then(setCoords).catch(() => {});
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Context-aware greeting when opening on a new page
  useEffect(() => {
    if (open && messages.length === 0 && historyLoaded) {
      const greeting = getGreeting(location.pathname);
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [open, location.pathname, historyLoaded]);

  // Auto-open after 10 seconds on first visit
  useEffect(() => {
    if (hasAutoGreeted) return;
    const timer = setTimeout(() => {
      if (!open) {
        setOpen(true);
        setHasAutoGreeted(true);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [open, hasAutoGreeted]);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;
    if (!overrideText) setInput("");

    const userMsg: Msg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    // Save user message
    let convId = activeConversationId;
    try {
      convId = await saveMessage(userMsg, convId);
    } catch (error) {
      console.error("Failed to save user chat message", error);
    }

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length === updatedMessages.length + 1) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: updatedMessages.filter((m, index) => !(index === 0 && m.role === "assistant")),
        userCoords: coords,
        onDelta: upsert,
        onDone: async () => {
          setLoading(false);
          // Save assistant response
          if (assistantSoFar) {
            try {
              await saveMessage({ role: "assistant", content: assistantSoFar }, convId);
            } catch (error) {
              console.error("Failed to save assistant chat message", error);
            }
          }
        },
        onError: (msg) => {
          toast.error(msg);
          setLoading(false);
        },
      });
    } catch {
      toast.error("Failed to reach the assistant");
      setLoading(false);
    }
  }, [input, loading, messages, coords, activeConversationId, saveMessage]);

  const handleNewConversation = () => {
    startNewConversation();
    setShowHistory(false);
    const greeting = getGreeting(location.pathname);
    setMessages([{ role: "assistant", content: greeting }]);
  };

  const handleLoadConversation = (id: string) => {
    loadConversation(id);
    setShowHistory(false);
  };

  const showQuickReplies = messages.length <= 1 && !loading;

  return (
    <>
      {/* Floating button with pulse animation */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 h-12 rounded-2xl border bg-card px-4 text-foreground shadow-premium hover:bg-muted flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] group"
          aria-label="Open support chat"
        >
          <Bot className="h-5 w-5" />
          <span className="text-xs font-semibold">AI Assistant</span>
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-accent border-2 border-background animate-pulse" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:bottom-6 md:right-6 z-50 md:w-[380px] max-w-[calc(100vw-2rem)] h-[70vh] md:h-[520px] max-h-[calc(100vh-7rem)] md:max-h-[calc(100vh-4rem)] bg-card border rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="h-5 w-5" />
                <Sparkles className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5" />
              </div>
              <div>
                <span className="font-semibold text-sm">AI Assistant</span>
                <span className="block text-[10px] opacity-80">Powered by AI • Always online</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {user && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-1.5 rounded-md hover:bg-primary-foreground/10 transition-colors"
                  title="Chat history"
                >
                  <History className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => { setOpen(false); setShowHistory(false); }} className="p-1.5 rounded-md hover:bg-primary-foreground/10 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* History panel */}
          {showHistory ? (
            <ChatHistory
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={handleLoadConversation}
              onNew={handleNewConversation}
              onDelete={deleteConversation}
              onBack={() => setShowHistory(false)}
            />
          ) : (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((msg, i) => (
                  <ChatMessage key={i} msg={msg} />
                ))}
                {loading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Quick replies */}
              {showQuickReplies && <QuickReplies onSelect={(msg) => send(msg)} disabled={loading} />}

              {/* Input */}
              <div className="p-3 border-t">
                <form
                  onSubmit={(e) => { e.preventDefault(); send(); }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Describe your problem..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 text-sm"
                    disabled={loading}
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || loading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default SupportChatbot;
