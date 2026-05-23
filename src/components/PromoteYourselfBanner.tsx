import { Megaphone, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function PromoteYourselfBanner({ variant = "default" }: { variant?: "default" | "compact" }) {
  const isCompact = variant === "compact";
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 ${isCompact ? "py-4" : ""}`}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-1 flex-1">
          <p className="text-sm font-bold text-hero-foreground">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
            Advertise yourself here
          </p>
          <p className="mt-0.5 text-xs text-hero-muted">
            Feature your profile or run a targeted ad to reach more clients nearby.
          </p>
        </div>
        <Link
          to="/worker-dashboard"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Learn more <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
