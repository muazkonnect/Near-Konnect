import { useEffect, useRef, useState } from "react";
import { Star, BadgeCheck, Award, MapPin, Briefcase, ArrowRight, Sparkles, Zap, Shield } from "lucide-react";
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

  const badgeLabel = premium ? "Featured Pro" : campaignId ? "Promoted" : "Sponsored";
  const BadgeIcon = premium ? Award : Sparkles;

  return (
    <>
      <div
        ref={cardRef}
        className={`group relative w-[330px] rounded-[20px] p-[1px] sm:w-[400px] ${
          premium
            ? "bg-gradient-to-br from-primary via-primary/30 to-primary/60 shadow-[0_12px_44px_-14px_hsl(var(--primary)/0.7)]"
            : "bg-gradient-to-br from-hero-foreground/20 via-primary/25 to-hero-foreground/10 shadow-[0_10px_32px_-16px_hsl(var(--primary)/0.45)]"
        }`}
      >
        <article
          onClick={handleOpen}
          className="relative cursor-pointer overflow-hidden rounded-[19px] bg-hero/98 backdrop-blur-xl transition-transform duration-300 active:scale-[0.985]"
        >
          {/* Subtle ambient glow */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-primary/8 blur-3xl" />

          {/* ====== HEADER STRIP ====== */}
          <div className="relative flex items-center justify-between border-b border-hero-foreground/8 px-3 py-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.16em] ${
                premium
                  ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-sm shadow-primary/40"
                  : "bg-hero-foreground/8 text-hero-foreground/80 ring-1 ring-hero-foreground/10"
              }`}
            >
              <BadgeIcon className="h-3 w-3" />
              {badgeLabel}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                worker.available
                  ? "bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-hero-foreground/10 text-hero-muted ring-1 ring-hero-foreground/15"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${worker.available ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_currentColor]" : "bg-hero-foreground/40"}`} />
              {worker.available ? "Available now" : "Busy"}
            </span>
          </div>

          {/* ====== MAIN ROW ====== */}
          <div className="relative flex gap-3 px-3 pt-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 -m-0.5 rounded-2xl bg-gradient-to-br from-primary/70 to-primary/10 opacity-80 blur-[5px]" />
              <Avatar className="relative h-[104px] w-[92px] rounded-2xl border-2 border-hero-foreground/10 shadow-xl">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-hero-foreground/10 text-xl font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {worker.verified && (
                <div className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg ring-2 ring-hero">
                  <Shield className="h-3 w-3 fill-primary-foreground text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Category chip */}
              {(worker.mainCategory || worker.subCategory) && (
                <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em]">
                  {worker.mainCategory && (
                    <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-primary ring-1 ring-primary/25">
                      {worker.mainCategory}
                    </span>
                  )}
                  {worker.subCategory && (
                    <span className="truncate text-hero-foreground/70">› {worker.subCategory}</span>
                  )}
                </div>
              )}

              {/* Name — LARGE */}
              <div className="mt-1 flex items-start gap-1">
                <h3 className="line-clamp-2 text-[22px] font-extrabold leading-[1.1] tracking-tight text-hero-foreground">
                  {worker.name}
                </h3>
                {worker.verified && <BadgeCheck className="mt-1 h-5 w-5 shrink-0 fill-primary text-hero" />}
              </div>

              {/* Profession */}
              {worker.profession && (
                <p className="mt-0.5 truncate text-[12.5px] font-semibold text-primary/90">
                  {worker.profession}
                </p>
              )}

              {/* Rating row */}
              <div className="mt-1.5 flex items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-500/15 to-transparent px-1.5 py-0.5 ring-1 ring-amber-500/30">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-[12px] font-extrabold leading-none text-hero-foreground">
                    {worker.rating?.toFixed(1) || "—"}
                  </span>
                  {worker.reviewCount > 0 && (
                    <span className="text-[9.5px] font-semibold leading-none text-hero-muted">
                      ({worker.reviewCount})
                    </span>
                  )}
                </div>
                {worker.city && (
                  <span className="inline-flex min-w-0 items-center gap-0.5 text-[10.5px] font-semibold text-hero-muted">
                    <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                    <span className="truncate">{worker.city}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {worker.description && (
            <p className="relative mt-2.5 line-clamp-2 px-3 text-[11.5px] leading-snug text-hero-foreground/70">
              {worker.description}
            </p>
          )}

          {/* ====== STATS (2-col) ====== */}
          <div className="relative mx-3 mt-3 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 px-2.5 py-2 text-primary-foreground shadow-md shadow-primary/30">
              <MapPin className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="text-[14px] font-extrabold leading-none">
                  {hasDistance ? worker.distance : "—"}
                  {hasDistance && <span className="ml-0.5 text-[10px] opacity-90">km</span>}
                </div>
                <div className="mt-0.5 text-[8.5px] font-bold uppercase tracking-wider opacity-85">Distance</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-hero-foreground/6 px-2.5 py-2 ring-1 ring-hero-foreground/10">
              <Briefcase className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="text-[14px] font-extrabold leading-none text-hero-foreground">
                  {worker.experience > 0 ? `${worker.experience}+` : "—"}
                </div>
                <div className="mt-0.5 text-[8.5px] font-bold uppercase tracking-wider text-hero-muted">Years Exp</div>
              </div>
            </div>
          </div>

          {/* Service areas */}
          {worker.serviceAreas && worker.serviceAreas.length > 0 && (
            <div className="relative mx-3 mt-2 flex items-center gap-1.5 overflow-hidden">
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-hero-muted">Serves</span>
              <div className="flex min-w-0 flex-1 gap-1 overflow-hidden">
                {worker.serviceAreas.slice(0, 3).map((area, i) => (
                  <span
                    key={i}
                    className="truncate rounded-full bg-hero-foreground/5 px-1.5 py-0.5 text-[9.5px] font-semibold text-hero-foreground/85 ring-1 ring-hero-foreground/10"
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

          {/* ====== CTA ROW ====== */}
          <div
            className="relative mt-3 flex items-center gap-2 border-t border-hero-foreground/8 bg-hero-foreground/[0.02] px-3 py-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-9 flex-1 rounded-lg border border-hero-foreground/10 bg-hero-foreground/5 px-2 text-[11.5px] font-bold text-hero-foreground hover:bg-hero-foreground/10"
              onClick={() => { fireClick(); setPopupOpen(true); }}
            >
              View Profile
            </Button>
            {isAuthed ? (
              <Button
                size="sm"
                className="h-9 flex-[1.5] rounded-lg bg-gradient-to-r from-primary via-primary to-primary/85 px-2 text-[12px] font-extrabold shadow-lg shadow-primary/40 hover:shadow-primary/60"
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
                  className="h-9 flex-[1.5] rounded-lg bg-gradient-to-r from-primary via-primary to-primary/85 px-2 text-[12px] font-extrabold shadow-lg shadow-primary/40 hover:shadow-primary/60"
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
