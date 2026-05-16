import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, Compass, HelpCircle, Info, Network, Satellite } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Background visuals */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/4 -right-[10%] h-[400px] w-[400px] rounded-full bg-destructive/5 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <main className="relative z-10 flex min-h-[100dvh] items-center justify-center px-5 py-20 md:px-16">
        <section className="flex w-full max-w-4xl flex-col items-center text-center">
          {/* Error visual group */}
          <div className="relative mb-12">
            <div className="absolute -top-12 -left-12 flex h-24 w-24 items-center justify-center rounded-full border border-border/40">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <h2 className="select-none text-[160px] md:text-[240px] font-extrabold leading-none tracking-tighter text-muted-foreground/10">
              404
            </h2>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-20 w-20 rotate-12 items-center justify-center rounded-2xl border border-border/40 bg-card shadow-[0_0_20px_hsl(var(--primary)/0.1)]">
                <Satellite className="h-10 w-10 text-primary" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-xl space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Signal Interrupted
            </span>
            <h3 className="text-3xl font-semibold tracking-tight md:text-4xl">
              This coordinate doesn't exist
            </h3>
            <p className="text-base text-muted-foreground md:text-lg">
              The node you're looking for has moved out of range or was never indexed in our
              hyperlocal grid. Your connection is secure, but the destination is offline.
            </p>
            <p className="pt-2 text-xs font-mono text-muted-foreground/60">{location.pathname}</p>
          </div>

          {/* Actions */}
          <div className="mt-12 grid w-full max-w-md grid-cols-1 gap-3 md:grid-cols-2">
            <a
              href="/"
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95"
            >
              <Home className="h-4 w-4" />
              Go Home
            </a>
            <a
              href="/discover"
              className="flex items-center justify-center gap-2 rounded-xl border border-border/40 bg-transparent px-8 py-4 text-sm font-medium text-foreground backdrop-blur-sm transition-all hover:bg-muted/30 active:scale-95"
            >
              <Compass className="h-4 w-4" />
              Search Nearby
            </a>
          </div>

          {/* Sub-links */}
          <div className="mt-20 flex flex-wrap items-center justify-center gap-6">
            <a href="/" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60 transition-colors hover:text-foreground">
              <HelpCircle className="h-3 w-3" />
              Contact Support
            </a>
            <div className="h-1 w-1 rounded-full bg-border" />
            <a href="/" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60 transition-colors hover:text-foreground">
              <Info className="h-3 w-3" />
              Status Page
            </a>
            <div className="h-1 w-1 rounded-full bg-border" />
            <a href="/" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60 transition-colors hover:text-foreground">
              <Network className="h-3 w-3" />
              Community Hub
            </a>
          </div>
        </section>

        {/* Aesthetic decoration */}
        <div className="pointer-events-none absolute bottom-16 left-1/2 hidden w-full max-w-7xl -translate-x-1/2 items-end justify-between px-16 opacity-20 md:flex">
          <div className="flex flex-col gap-1">
            <div className="h-px w-32 bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Lat: 37.7749° N</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest">Long: 122.4194° W</span>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <div className="ml-auto h-px w-32 bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Protocol: Konnect-v4.2</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest">System: Hyperlocal-OS</span>
          </div>
        </div>
      </main>

      <footer className="pointer-events-none absolute bottom-0 left-0 flex w-full justify-center px-5 py-2">
        <p className="text-xs font-semibold text-muted-foreground/40">
          © 2026 Near Konnect. All systems nominal except this one.
        </p>
      </footer>
    </div>
  );
};

export default NotFound;
