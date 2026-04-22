import { useParams } from "react-router-dom";
import { useEffect } from "react";
import ChatWindow from "@/components/ChatWindow";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { markRead } from "@/hooks/useNotifications";
import AppLayout from "@/components/AppLayout";

const Chat = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { role } = useUserRole();

  useEffect(() => {
    if (!user || !userId) return;
    markRead((n) => (n.type === "message" || n.type === "contact_request") && n.link === `/chat/${userId}`);
  }, [user, userId]);

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
    <AppLayout title="Chat" subtitle={`Conversation with ${otherProfile?.full_name || "Client"}`}>
      <div className="flex flex-1 flex-col">
        <div className="flex min-h-[62vh] flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
          <ChatWindow
            otherUserId={userId}
            otherUserName={otherProfile?.full_name || "Client"}
            backLink={backLink}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Chat;
