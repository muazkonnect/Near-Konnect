import { useEffect } from "react";
import { WifiOff, RefreshCw, Router, Globe, ArrowRight } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const Offline = () => {
  const online = useOnlineStatus();

  useEffect(() => {
    if (online) {
      const t = setTimeout(() => window.history.back(), 600);
      return () => clearTimeout(t);
    }
  }, [online]);

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground"
      style={{
        backgroundImage:
          "linear-gradient(hsl(var(--border) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.4) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <main className="relative flex min-h-[100dvh] items-center justify-center px-5 md:px-16">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-20">
          <div className="h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <section className="relative z-10 w-full max-w-xl text-center">
          {/* Signal lost cluster */}
          <div className="mb-12 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-32 w-32 animate-ping rounded-full border border-primary/30 opacity-20" />
              <div
                className="absolute h-48 w-48 animate-ping rounded-full border border-primary/10 opacity-10"
                style={{ animationDelay: "1s" }}
              />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-border/50 bg-card/80 backdrop-blur-xl">
                <WifiOff className="h-12 w-12 text-primary" strokeWidth={1.5} />
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-xs font-semibold uppercase tracking-widest text-destructive">
                Connection Interrupted
              </span>
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-6">
            <h1 className="text-5xl font-bold tracking-tighter md:text-6xl">Off the Grid</h1>
            <p className="mx-auto max-w-md text-base text-muted-foreground md:text-lg">
              Your device has lost its connection to the hyperlocal node. We'll reconnect you as
              soon as you're back in range.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-20 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <button
              onClick={() => window.location.reload()}
              className="group relative flex items-center gap-3 overflow-hidden rounded-lg bg-primary px-12 py-4 text-sm font-medium text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.15)] transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.25)] active:scale-95"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Retry Connection</span>
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="rounded-lg border border-border/50 bg-transparent px-12 py-4 text-sm font-medium text-foreground transition-all duration-300 hover:border-foreground/40 hover:bg-muted/30 active:scale-95"
            >
              View Offline Services
            </button>
          </div>

          {/* Subtle grid info */}
          <div className="mt-20 flex flex-col items-center gap-2 border-t border-border/30 pt-12">
            <div className="flex items-center gap-6 opacity-40">
              <div className="flex items-center gap-1.5">
                <Router className="h-[18px] w-[18px]" />
                <span className="text-xs font-semibold">Node ID: HK-9921</span>
              </div>
              <div className="h-1 w-1 rounded-full bg-border" />
              <div className="flex items-center gap-1.5">
                <Globe className="h-[18px] w-[18px]" />
                <span className="text-xs font-semibold">Protocol: v2.4</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground/60">
              {online ? "Reconnecting…" : "No connection detected"}
            </p>
          </div>
        </section>
      </main>

      {/* Floating bottom link */}
      <div className="pointer-events-none fixed bottom-4 left-0 z-20 flex w-full justify-center">
        <a
          href="/"
          className="group pointer-events-auto flex items-center gap-1 px-6 py-2 text-muted-foreground transition-colors duration-200 hover:text-primary"
        >
          <span className="text-sm font-medium">Need manual setup?</span>
          <span className="text-sm font-medium underline decoration-border underline-offset-4 group-hover:decoration-primary">
            Go to Settings
          </span>
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

export default Offline;
