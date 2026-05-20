import { useRef, useState } from "react";
import { Star, BadgeCheck, Award, MapPin, Briefcase, Phone, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";
import WorkerProfilePopup from "@/components/WorkerProfilePopup";
import type { Worker } from "@/data/mockData";

interface Props {
  worker: Worker & { distance: number };
  premium?: boolean;
  isAuthed: boolean;
}

/** Horizontal ad-style worker card with all key details. */
const WorkerAdCard = ({ worker, premium = false, isAuthed }: Props) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const lastClosedRef = useRef(0);
  const initials = worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const distLabel =
    worker.distance > 0 && isFinite(worker.distance) ? `${worker.distance} km` : "Nearby";

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
        className={`relative flex w-[340px] cursor-pointer items-stretch gap-3 overflow-hidden rounded-2xl border p-3 transition-all sm:w-[420px] ${
          premium
            ? "border-primary/25 bg-gradient-to-r from-primary/[0.1] via-primary/[0.04] to-transparent shadow-[0_0_28px_-14px_hsl(var(--primary)/0.6)] hover:border-primary/45"
            : "border-hero-foreground/10 bg-hero-foreground/[0.04] hover:border-hero-foreground/20"
        }`}
      >
        {/* Sponsored / Premium ribbon */}
        <div className="absolute left-0 top-0 inline-flex items-center gap-1 rounded-br-lg bg-hero-foreground/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-hero-muted">
          {premium ? (
            <>
              <Award className="h-2.5 w-2.5 text-primary" />
              <span className="text-primary">Featured</span>
            </>
          ) : (
            "Sponsored"
          )}
        </div>

        {/* Left: photo */}
        <div className="relative shrink-0 self-center">
          <Avatar className="h-24 w-24 rounded-xl border border-hero-foreground/10">
            <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-hero-foreground/10 text-base font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            className={`absolute -bottom-1 -right-1 inline-flex items-center gap-1 rounded-full border border-hero px-1.5 py-0.5 text-[9px] font-bold ${
              worker.available
                ? "bg-primary text-primary-foreground"
                : "bg-hero-foreground/30 text-hero-foreground"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {worker.available ? "Open" : "Busy"}
          </span>
        </div>

        {/* Right: details */}
        <div className="flex min-w-0 flex-1 flex-col justify-between pt-3">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h3 className="truncate text-sm font-bold text-hero-foreground">{worker.name}</h3>
                  {worker.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </div>
                <p className="truncate text-xs font-semibold text-primary/90">{worker.profession}</p>
              </div>
              <div className="shrink-0 rounded-md bg-hero-foreground/10 px-1.5 py-0.5 text-right">
                <div className="inline-flex items-center gap-0.5 text-primary">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-xs font-bold">{worker.rating?.toFixed(1) || "—"}</span>
                </div>
              </div>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-hero-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary/70" />
                <span className="font-semibold text-hero-foreground">{distLabel} away</span>
              </span>
              {worker.experience > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3 text-primary/70" />
                  <span className="font-semibold text-hero-foreground">{worker.experience}+ yrs</span>
                </span>
              )}
              {worker.mainCategory && (
                <span className="rounded-full bg-hero-foreground/8 px-1.5 py-0.5 font-semibold uppercase tracking-wider">
                  {worker.mainCategory}
                </span>
              )}
            </div>
          </div>

          <div
            className="mt-2 flex items-center gap-1.5 border-t border-hero-foreground/5 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 flex-1 rounded-md bg-hero-foreground/5 px-2 text-[11px] font-semibold text-hero-foreground hover:bg-hero-foreground/10"
              onClick={() => setPopupOpen(true)}
            >
              View <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
            {isAuthed ? (
              <Button
                size="sm"
                className="h-7 flex-1 rounded-md px-2 text-[11px] font-semibold"
                onClick={() => setPopupOpen(true)}
              >
                <Phone className="mr-1 h-3 w-3" /> Contact
              </Button>
            ) : (
              <AuthRequiredDialog
                title="Log in to contact"
                description="Sign in or create an account to contact this provider."
              >
                <Button size="sm" className="h-7 flex-1 rounded-md px-2 text-[11px] font-semibold">
                  <Phone className="mr-1 h-3 w-3" /> Contact
                </Button>
              </AuthRequiredDialog>
            )}
          </div>
        </div>
      </article>
      <WorkerProfilePopup worker={worker} open={popupOpen} onOpenChange={handleChange} isAuthed={isAuthed} />
    </>
  );
};

export default WorkerAdCard;
