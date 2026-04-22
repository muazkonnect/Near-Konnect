import { useEffect, useState } from "react";
import { Bell, BellRing, BellOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useNotifications, markOneRead, markAllRead } from "@/hooks/useNotifications";
import {
  canUseWebPush,
  isPreview,
  isSubscribed,
  subscribeWebPush,
  unsubscribeWebPush,
} from "@/lib/pushNotifications";
import { toast } from "sonner";

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!user || !canUseWebPush() || isPreview()) return;
    isSubscribed().then(setPushOn);
  }, [user]);

  const handleClick = (notif: typeof items[number]) => {
    markOneRead(notif.id);
    setOpen(false);
    navigate(notif.link);
  };

  const togglePush = async () => {
    if (!user) return;
    setPushBusy(true);
    try {
      if (pushOn) {
        await unsubscribeWebPush(user.id);
        setPushOn(false);
        toast.success("Push notifications disabled");
      } else {
        const ok = await subscribeWebPush(user.id);
        setPushOn(ok);
        toast[ok ? "success" : "error"](
          ok ? "Push notifications enabled" : "Couldn't enable push notifications"
        );
      }
    } finally {
      setPushBusy(false);
    }
  };

  const showPushToggle = !!user && canUseWebPush() && !isPreview();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 bg-inherit text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <div className="flex items-center gap-3">
            {showPushToggle && (
              <button
                onClick={togglePush}
                disabled={pushBusy}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                title={pushOn ? "Disable push" : "Enable push"}
              >
                {pushOn ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                {pushOn ? "On" : "Off"}
              </button>
            )}
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            items.map((notif) => (
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
