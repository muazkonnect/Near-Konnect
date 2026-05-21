import { useRef, useState } from "react";
import { Star, BadgeCheck, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";
import WorkerProfilePopup from "@/components/WorkerProfilePopup";
import type { Worker } from "@/data/mockData";

interface ExploreCardProps {
  worker: Worker & { distance: number };
  premium?: boolean;
  isAuthed: boolean;
}

const ExploreCard = ({ worker, premium = false, isAuthed }: ExploreCardProps) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const lastClosedRef = useRef(0);
  const initials = worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const distLabel = worker.distance > 0 && isFinite(worker.distance) ? `${worker.distance} km away` : "Distance unknown";

  const handleOpen = () => {
    if (popupOpen) return;
    if (Date.now() - lastClosedRef.current < 300) return;
    setPopupOpen(true);
  };
  const handleChange = (o: boolean) => {
    if (!o) lastClosedRef.current = Date.now();
    setPopupOpen(o);
  };

  return (
    <>
      <article
        onClick={handleOpen}
        className={`relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border p-4 transition-all ${
          premium
            ? "border-amber-400/50 bg-gradient-to-br from-amber-500/[0.14] via-amber-400/[0.06] to-transparent shadow-[0_12px_40px_-12px_hsl(45_93%_47%/0.55)] ring-1 ring-amber-400/30 hover:border-amber-400/80"
            : "border-hero-foreground/10 bg-hero-foreground/[0.04] hover:border-hero-foreground/20"
        }`}
      >
        {premium && (
          <>
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-bl-xl bg-gradient-to-r from-amber-400 to-amber-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              <Crown className="h-3 w-3" fill="currentColor" /> Premium
            </div>
          </>
        )}

        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0 group">
              <Avatar className="h-16 w-16 rounded-lg border border-hero-foreground/10">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className="rounded-lg bg-hero-foreground/10 text-sm font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-hero ${
                  worker.available ? "bg-primary" : "bg-hero-foreground/30"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="truncate text-sm font-bold text-hero-foreground">{worker.name}</h3>
                {worker.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </div>
              <p className="truncate text-xs text-primary/80">{worker.profession}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="inline-flex items-center gap-1 text-primary">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="text-sm font-bold">{worker.rating?.toFixed(1) || "—"}</span>
            </div>
            <p className="mt-0.5 text-[10px] text-hero-muted">{distLabel}</p>
          </div>
        </div>

        {(worker.mainCategory || worker.subCategory) && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-hero-muted">
            {worker.mainCategory && <span className="text-hero-foreground">{worker.mainCategory}</span>}
            {worker.mainCategory && worker.subCategory && <span className="opacity-40">•</span>}
            {worker.subCategory && <span>{worker.subCategory}</span>}
            {worker.experience > 0 && (
              <>
                <span className="opacity-40">•</span>
                <span className="text-primary/80">{worker.experience}+ yrs</span>
              </>
            )}
          </div>
        )}

        <div className="mt-auto flex gap-2 border-t border-hero-foreground/5 pt-3" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            className="flex-1 rounded-lg bg-hero-foreground/5 text-xs font-semibold text-hero-foreground hover:bg-hero-foreground/10"
            onClick={() => setPopupOpen(true)}
          >
            View Profile
          </Button>
          {isAuthed ? (
            <Button
              className="flex-1 rounded-lg text-xs font-semibold"
              onClick={() => setPopupOpen(true)}
            >
              Contact
            </Button>
          ) : (
            <AuthRequiredDialog title="Log in to contact" description="Sign in or create an account to contact this provider.">
              <Button className="flex-1 rounded-lg text-xs font-semibold">Contact</Button>
            </AuthRequiredDialog>
          )}
        </div>
      </article>
      <WorkerProfilePopup worker={worker} open={popupOpen} onOpenChange={handleChange} isAuthed={isAuthed} />
    </>
  );
};

export default ExploreCard;
