import { useParams } from "react-router-dom";
import { useEffect } from "react";
import ChatWindow from "@/components/ChatWindow";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { markRead } from "@/hooks/useNotifications";

const Chat = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { role } = useUserRole();

  useEffect(() => {
    if (!user || !userId) return;
    markRead((n) => (n.type === "message" || n.type === "contact_request") && n.link === `/chat/${userId}`);
  }, [user, userId]);

  // Lock body scroll while in the chat view so only the message list scrolls.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const { data: otherProfile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  if (!user || !userId) return null;

  const backLink = role === "worker" ? "/worker-dashboard" : "/dashboard";

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-hero"
      style={{ height: "100dvh" }}
    >
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
        <ChatWindow
          otherUserId={userId}
          otherUserName={otherProfile?.full_name || "Client"}
          otherUserAvatar={otherProfile?.avatar_url}
          backLink={backLink}
        />
      </div>
    </div>
  );
};

export default Chat;
