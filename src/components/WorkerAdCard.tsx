import { useEffect, useRef, useState } from "react";
import { Star, BadgeCheck, Award, MapPin, Briefcase, ArrowRight, Sparkles, Zap, Building2, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";
import WorkerProfilePopup from "@/components/WorkerProfilePopup";
import { trackAdEvent } from "@/hooks/usePromoted";
import type { Worker } from "@/data/mockData";

interface Props {
  worker: Worker & { distance: number };
  premium?: boolean;
  isAuthed: boolean;
  campaignId?: string;
  placement?: string;
}

const WorkerAdCard = ({ worker, premium = false, isAuthed, campaignId, placement }: Props) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const lastClosedRef = useRef(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const impressedRef = useRef(false);
  const initials = worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const hasDistance = worker.distance > 0 && isFinite(worker.distance);

  useEffect(() => {
    if (!campaignId || !cardRef.current || impressedRef.current) return;
    const el = cardRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !impressedRef.current) {
            impressedRef.current = true;
            trackAdEvent(campaignId, "impression", placement || "unknown");
            io.disconnect();
          }
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [campaignId, placement]);

  const fireClick = () => {
    if (campaignId) trackAdEvent(campaignId, "click", placement || "unknown");
  };

  const handleOpen = () => {
    if (popupOpen) return;
    if (Date.now() - lastClosedRef.current < 300) return;
    fireClick();
    setPopupOpen(true);
  };
  const handleChange = (o: boolean) => {
    if (!o) lastClosedRef.current = Date.now();
    setPopupOpen(o);
  };

  const badgeLabel = premium ? "Featured" : campaignId ? "Promoted" : "Sponsored";
  const BadgeIcon = premium ? Award : Sparkles;

  return (
    <>
      <div
        ref={cardRef}
        className={`group relative w-[330px] rounded-[22px] p-[1.5px] sm:w-[400px] ${
          premium
            ? "bg-[conic-gradient(from_140deg_at_50%_50%,hsl(var(--primary)),hsl(var(--primary)/0.2),hsl(var(--primary)/0.6),hsl(var(--primary)))] shadow-[0_10px_50px_-12px_hsl(var(--primary)/0.75)]"
            : "bg-gradient-to-br from-primary/50 via-hero-foreground/10 to-primary/20 shadow-[0_10px_36px_-16px_hsl(var(--primary)/0.5)]"
        }`}
      >
        <article
          onClick={handleOpen}
          className="relative cursor-pointer overflow-hidden rounded-[20px] bg-hero/95 backdrop-blur-xl transition-transform duration-300 active:scale-[0.985]"
        >
          {/* ====== HERO BANNER ====== */}
          <div className="relative h-[112px] w-full overflow-hidden">
            {/* Backdrop: photo blurred for ambience */}
            {worker.profilePhoto ? (
              <img
                src={worker.profilePhoto}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-hero to-primary/20" />
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-hero/20 via-hero/40 to-hero" />
            {/* Glow blobs */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-6 left-10 h-20 w-20 rounded-full bg-primary/20 blur-2xl" />

            {/* Top ribbon */}
            <div
              className={`absolute right-0 top-0 z-10 inline-flex items-center gap-1 rounded-bl-2xl px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] shadow-lg ${
                premium
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                  : "bg-hero-foreground/20 text-hero-foreground backdrop-blur-md"
              }`}
            >
              <BadgeIcon className="h-3 w-3" />
              {badgeLabel}
            </div>

            {/* Availability pill */}
            <div className="absolute left-2.5 top-2.5 z-10">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shadow-md ring-1 backdrop-blur-md ${
                  worker.available
                    ? "bg-primary/90 text-primary-foreground ring-primary/50"
                    : "bg-hero-foreground/30 text-hero-foreground ring-hero-foreground/20"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${worker.available ? "bg-hero-foreground animate-pulse" : "bg-hero/70"}`} />
                {worker.available ? "Available now" : "Busy"}
              </span>
            </div>

            {/* Category breadcrumb bottom-left of hero */}
            <div className="absolute bottom-2 left-[120px] right-2.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[9px] font-bold uppercase tracking-[0.08em]">
              {worker.mainCategory && (
                <span className="rounded-md bg-primary/25 px-1.5 py-0.5 text-primary ring-1 ring-primary/40 backdrop-blur-sm">
                  {worker.mainCategory}
                </span>
              )}
              {worker.subCategory && (
                <span className="truncate text-hero-foreground/80">› {worker.subCategory}</span>
              )}
            </div>
          </div>

          {/* ====== AVATAR (overlapping hero) ====== */}
          <div className="relative -mt-[60px] flex items-end gap-3 px-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 -m-1 rounded-2xl bg-gradient-to-br from-primary to-primary/30 opacity-90 blur-md" />
              <Avatar className="relative h-[108px] w-[100px] rounded-2xl border-[3px] border-hero shadow-2xl">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-hero-foreground/10 text-xl font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* Verified shield */}
              {worker.verified && (
                <div className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg ring-2 ring-hero">
                  <Shield className="h-3 w-3 fill-primary-foreground text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Rating column */}
            <div className="mb-1 flex flex-1 items-end justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h3 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-hero-foreground">
                    {worker.name}
                  </h3>
                  {worker.verified && <BadgeCheck className="h-4 w-4 shrink-0 fill-primary text-hero" />}
                </div>
                {worker.profession && (
                  <p className="truncate text-[12px] font-semibold text-primary/90">
                    {worker.profession}
                  </p>
                )}
              </div>

              {/* Big rating block */}
              <div className="flex shrink-0 flex-col items-center rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 to-transparent px-2 py-1 shadow-md ring-1 ring-primary/20">
                <div className="flex items-center gap-0.5 text-primary">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-[13px] font-extrabold leading-none">
                    {worker.rating?.toFixed(1) || "—"}
                  </span>
                </div>
                {worker.reviewCount > 0 && (
                  <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-hero-muted">
                    {worker.reviewCount} {worker.reviewCount === 1 ? "review" : "reviews"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ====== INFO BODY ====== */}
          <div className="relative px-3 pt-2.5">
            {/* Description */}
            {worker.description && (
              <p className="line-clamp-2 text-[11px] leading-snug text-hero-foreground/75">
                {worker.description}
              </p>
            )}

            {/* Stats row */}
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/75 px-1.5 py-1.5 text-primary-foreground shadow-md shadow-primary/30">
                <MapPin className="h-3.5 w-3.5" />
                <span className="mt-0.5 text-[12px] font-extrabold leading-none">
                  {hasDistance ? worker.distance : "—"}
                  {hasDistance && <span className="ml-0.5 text-[9px] opacity-90">km</span>}
                </span>
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider opacity-80">Away</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg bg-hero-foreground/8 px-1.5 py-1.5 text-hero-foreground ring-1 ring-hero-foreground/10">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                <span className="mt-0.5 text-[12px] font-extrabold leading-none">
                  {worker.experience > 0 ? `${worker.experience}+` : "—"}
                </span>
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-hero-muted">Years</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg bg-hero-foreground/8 px-1.5 py-1.5 text-hero-foreground ring-1 ring-hero-foreground/10">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span className="mt-0.5 max-w-full truncate text-[11px] font-extrabold leading-none">
                  {worker.city || "—"}
                </span>
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-hero-muted">City</span>
              </div>
            </div>

            {/* Service areas */}
            {worker.serviceAreas && worker.serviceAreas.length > 0 && (
              <div className="mt-2 flex items-center gap-1 overflow-hidden">
                <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-hero-muted">Serves</span>
                <div className="flex min-w-0 flex-1 gap-1 overflow-hidden">
                  {worker.serviceAreas.slice(0, 3).map((area, i) => (
                    <span
                      key={i}
                      className="truncate rounded-full bg-hero-foreground/6 px-1.5 py-0.5 text-[9.5px] font-semibold text-hero-foreground/85 ring-1 ring-hero-foreground/10"
                    >
                      {area}
                    </span>
                  ))}
                  {worker.serviceAreas.length > 3 && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9.5px] font-bold text-primary ring-1 ring-primary/30">
                      +{worker.serviceAreas.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ====== CTA ROW ====== */}
          <div
            className="relative mt-3 flex items-center gap-2 px-3 pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-9 flex-1 rounded-xl border border-hero-foreground/10 bg-hero-foreground/5 px-2 text-[11px] font-bold text-hero-foreground backdrop-blur hover:bg-hero-foreground/10"
              onClick={() => { fireClick(); setPopupOpen(true); }}
            >
              View Profile
            </Button>
            {isAuthed ? (
              <Button
                size="sm"
                className="h-9 flex-[1.5] rounded-xl bg-gradient-to-r from-primary via-primary to-primary/85 px-2 text-[11.5px] font-extrabold shadow-lg shadow-primary/40 hover:shadow-primary/60"
                onClick={() => { fireClick(); setPopupOpen(true); }}
              >
                <Zap className="mr-1 h-3.5 w-3.5 fill-current" /> Contact Now
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            ) : (
              <AuthRequiredDialog
                title="Log in to contact"
                description="Sign in or create an account to contact this provider."
              >
                <Button
                  size="sm"
                  className="h-9 flex-[1.5] rounded-xl bg-gradient-to-r from-primary via-primary to-primary/85 px-2 text-[11.5px] font-extrabold shadow-lg shadow-primary/40 hover:shadow-primary/60"
                >
                  <Zap className="mr-1 h-3.5 w-3.5 fill-current" /> Contact Now
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </AuthRequiredDialog>
            )}
          </div>
        </article>
      </div>
      <WorkerProfilePopup worker={worker} open={popupOpen} onOpenChange={handleChange} isAuthed={isAuthed} />
    </>
  );
};

export default WorkerAdCard;
