import { useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const Offline = () => {
  const online = useOnlineStatus();

  useEffect(() => {
    if (online) {
      // Auto-bounce back when connection returns
      const t = setTimeout(() => window.history.back(), 600);
      return () => clearTimeout(t);
    }
  }, [online]);

  return (
    <div className="min-h-[100dvh] bg-hero text-hero-foreground flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center ring-8 ring-primary/5">
          <WifiOff className="h-11 w-11 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">You're offline</h1>
          <p className="text-sm text-hero-muted">
            Near Konnect needs an internet connection to load fresh data. Check your Wi-Fi or
            mobile data and try again.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => window.location.reload()}
            className="w-full rounded-2xl"
            size="lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="w-full rounded-2xl border-hero-muted/30 bg-transparent text-hero-foreground hover:bg-white/5"
            size="lg"
          >
            Go to home
          </Button>
        </div>
        <p className="text-xs text-hero-muted">
          {online ? "Reconnecting…" : "No connection detected"}
        </p>
      </div>
    </div>
  );
};

export default Offline;
