import { useRef, useState } from "react";
import { Star, BadgeCheck, Award, MapPin, Briefcase, Phone, ArrowRight, Sparkles } from "lucide-react";
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

/** Mobile-first ad-style worker card. */
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
        className={`group relative w-[330px] cursor-pointer overflow-hidden rounded-2xl border transition-all sm:w-[400px] ${
          premium
            ? "border-primary/30 bg-gradient-to-br from-primary/[0.12] via-hero-foreground/[0.04] to-transparent shadow-[0_0_32px_-14px_hsl(var(--primary)/0.7)] hover:border-primary/50"
            : "border-hero-foreground/10 bg-gradient-to-br from-hero-foreground/[0.06] to-hero-foreground/[0.02] hover:border-primary/30"
        }`}
      >
        {/* Accent bar */}
        <div
          className={`absolute inset-y-0 left-0 w-1 ${
            premium ? "bg-gradient-to-b from-primary to-primary/40" : "bg-gradient-to-b from-primary/60 to-transparent"
          }`}
        />

        {/* Ribbon */}
        <div
          className={`absolute right-0 top-0 inline-flex items-center gap-1 rounded-bl-xl px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] shadow-md ${
            premium
              ? "bg-primary text-primary-foreground"
              : "bg-hero-foreground/15 text-hero-foreground backdrop-blur"
          }`}
        >
          {premium ? <Award className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-primary" />}
          {premium ? "Featured" : "Sponsored"}
        </div>

        <div className="flex items-stretch gap-3 p-3 pl-4 pr-3">
          {/* Left: photo + availability */}
          <div className="relative shrink-0 self-stretch">
            <Avatar className="h-[100px] w-[88px] rounded-xl border border-hero-foreground/10 shadow-md">
              <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
              <AvatarFallback className="rounded-xl bg-hero-foreground/10 text-base font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Rating chip overlay */}
            <div className="absolute -bottom-1.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-primary/30 bg-hero px-2 py-0.5 text-primary shadow-md">
              <Star className="h-3 w-3 fill-current" />
              <span className="text-[11px] font-bold">{worker.rating?.toFixed(1) || "—"}</span>
            </div>
          </div>

          {/* Right: details */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Category row above the name */}
            <div className="flex flex-wrap items-center gap-1 pr-16 text-[9px] font-bold uppercase tracking-[0.1em] text-hero-muted">
              {worker.mainCategory && (
                <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 text-primary">
                  {worker.mainCategory}
                </span>
              )}
              {worker.subCategory && (
                <>
                  <span className="opacity-40">›</span>
                  <span className="text-hero-foreground">{worker.subCategory}</span>
                </>
              )}
              {worker.profession && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-primary/80">{worker.profession}</span>
                </>
              )}
            </div>

            {/* Name */}
            <div className="mt-1 flex items-center gap-1">
              <h3 className="truncate text-[17px] font-extrabold leading-tight text-hero-foreground">
                {worker.name}
              </h3>
              {worker.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
            </div>

            {/* Meta */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-primary ring-1 ring-primary/30">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-[13px] font-extrabold leading-none">{distLabel}</span>
                <span className="text-[10px] font-semibold opacity-80">away</span>
              </span>

              {worker.experience > 0 && (
                <span className="inline-flex items-center gap-1 text-hero-foreground">
                  <Briefcase className="h-3 w-3 text-primary" />
                  <span className="font-bold">{worker.experience}+ yrs</span>
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  worker.available
                    ? "bg-primary/15 text-primary"
                    : "bg-hero-foreground/10 text-hero-muted"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${worker.available ? "bg-primary animate-pulse" : "bg-hero-foreground/40"}`} />
                {worker.available ? "Available" : "Busy"}
              </span>
            </div>

            {/* CTAs */}
            <div
              className="mt-2.5 flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 flex-1 rounded-lg bg-hero-foreground/5 px-2 text-[11px] font-bold text-hero-foreground hover:bg-hero-foreground/10"
                onClick={() => setPopupOpen(true)}
              >
                View <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
              {isAuthed ? (
                <Button
                  size="sm"
                  className="h-8 flex-[1.3] rounded-lg px-2 text-[11px] font-bold shadow-md"
                  onClick={() => setPopupOpen(true)}
                >
                  <Phone className="mr-1 h-3 w-3" /> Contact Now
                </Button>
              ) : (
                <AuthRequiredDialog
                  title="Log in to contact"
                  description="Sign in or create an account to contact this provider."
                >
                  <Button size="sm" className="h-8 flex-[1.3] rounded-lg px-2 text-[11px] font-bold shadow-md">
                    <Phone className="mr-1 h-3 w-3" /> Contact Now
                  </Button>
                </AuthRequiredDialog>
              )}
            </div>
          </div>
        </div>
      </article>
      <WorkerProfilePopup worker={worker} open={popupOpen} onOpenChange={handleChange} isAuthed={isAuthed} />
    </>
  );
};

export default WorkerAdCard;
