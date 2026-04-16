import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: "message" | "booking" | "blood_request";
  title: string;
  body: string;
  created_at: string;
  link: string;
  read: boolean;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch initial unread messages & bookings
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const notifs: Notification[] = [];

      // Unread messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, message_text, created_at, profiles!messages_sender_id_fkey_profiles(full_name)")
        .eq("receiver_id", user.id)
        .eq("status", "delivered")
        .order("created_at", { ascending: false })
        .limit(10);

      msgs?.forEach((m: any) => {
        notifs.push({
          id: `msg-${m.id}`,
          type: "message",
          title: `Message from ${m.profiles?.full_name || "Someone"}`,
          body: m.message_text?.slice(0, 60) || "New message",
          created_at: m.created_at,
          link: `/chat/${m.sender_id}`,
          read: false,
        });
      });

      // Recent bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, status, service_description, created_at, booking_date")
        .or(`customer_id.eq.${user.id},worker_id.eq.${user.id}`)
        .in("status", ["pending", "confirmed"])
        .order("created_at", { ascending: false })
        .limit(5);

      bookings?.forEach((b: any) => {
        notifs.push({
          id: `book-${b.id}`,
          type: "booking",
          title: `Booking ${b.status}`,
          body: `${b.service_description} on ${b.booking_date}`,
          created_at: b.created_at,
          link: "/dashboard",
          read: false,
        });
      });

      // Get user's blood group for matching requests
      const { data: profile } = await supabase
        .from("profiles")
        .select("blood_group, is_blood_donor")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.is_blood_donor && profile?.blood_group) {
        const { data: bloodReqs } = await supabase
          .from("blood_requests")
          .select("id, blood_group, urgency, message, city, created_at, requester_id")
          .eq("status", "open")
          .eq("blood_group", profile.blood_group)
          .neq("requester_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        for (const req of bloodReqs || []) {
          const { data: reqProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", req.requester_id)
            .maybeSingle();

          notifs.push({
            id: `blood-${req.id}`,
            type: "blood_request",
            title: `🩸 ${req.urgency === "critical" ? "CRITICAL: " : ""}${req.blood_group} Blood Needed`,
            body: `${reqProfile?.full_name || "Someone"} needs ${req.blood_group} blood${req.city ? ` in ${req.city}` : ""}`,
            created_at: req.created_at,
            link: "/blood-donors",
            read: false,
          });
        }
      }

      notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(notifs.slice(0, 15));
    };

    fetchNotifications();
  }, [user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const channelName = `notif-${user.id}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
      async (payload: any) => {
        if (cancelled) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", payload.new.sender_id)
          .maybeSingle();

        const senderName = profile?.full_name || "Someone";
        const notif: Notification = {
          id: `msg-${payload.new.id}`,
          type: "message",
          title: `Message from ${senderName}`,
          body: payload.new.message_text?.slice(0, 60) || "New message",
          created_at: payload.new.created_at,
          link: `/chat/${payload.new.sender_id}`,
          read: false,
        };

        setNotifications((prev) => [notif, ...prev].slice(0, 15));
        toast.info(`💬 ${senderName}`, { description: payload.new.message_text?.slice(0, 80) });
      }
    );

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "bookings" },
      (payload: any) => {
        if (cancelled) return;
        if (payload.new.customer_id !== user.id && payload.new.worker_id !== user.id) return;
        const notif: Notification = {
          id: `book-${payload.new.id}`,
          type: "booking",
          title: "New Booking",
          body: `${payload.new.service_description} on ${payload.new.booking_date}`,
          created_at: payload.new.created_at,
          link: "/dashboard",
          read: false,
        };
        setNotifications((prev) => [notif, ...prev].slice(0, 15));
        toast.info("📋 New Booking", { description: payload.new.service_description });
      }
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "bookings" },
      (payload: any) => {
        if (cancelled) return;
        if (payload.new.customer_id !== user.id && payload.new.worker_id !== user.id) return;
        toast.info(`📋 Booking ${payload.new.status}`, { description: payload.new.service_description });
      }
    );

    // Blood request notifications
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "blood_requests" },
      async (payload: any) => {
        if (cancelled) return;
        if (payload.new.requester_id === user.id) return;

        // Check if user is a donor with matching blood group
        const { data: profile } = await supabase
          .from("profiles")
          .select("blood_group, is_blood_donor")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile?.is_blood_donor || profile?.blood_group !== payload.new.blood_group) return;

        const { data: reqProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", payload.new.requester_id)
          .maybeSingle();

        const notif: Notification = {
          id: `blood-${payload.new.id}`,
          type: "blood_request",
          title: `🩸 ${payload.new.urgency === "critical" ? "CRITICAL: " : ""}${payload.new.blood_group} Blood Needed`,
          body: `${reqProfile?.full_name || "Someone"} needs ${payload.new.blood_group} blood${payload.new.city ? ` in ${payload.new.city}` : ""}`,
          created_at: payload.new.created_at,
          link: "/blood-donors",
          read: false,
        };

        setNotifications((prev) => [notif, ...prev].slice(0, 15));
        toast.error(`🩸 ${payload.new.blood_group} Blood Needed!`, {
          description: notif.body,
          duration: 10000,
        });
      }
    );

    channel.subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleClick = (notif: Notification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setOpen(false);
    navigate(notif.link);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${
                  !notif.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                  <div className={!notif.read ? "" : "ml-4"}>
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{notif.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
