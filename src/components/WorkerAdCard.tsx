import { useEffect, useRef, useState } from "react";
import { Star, BadgeCheck, Crown, MapPin, Briefcase, ArrowUpRight, Sparkles, Zap, ShieldCheck } from "lucide-react";
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
  const BadgeIcon = premium ? Crown : Sparkles;

  return (
    <>
      <div
        ref={cardRef}
        className={`group relative w-[330px] rounded-[24px] p-[1px] sm:w-[400px] ${
          premium
            ? "bg-gradient-to-br from-primary/70 via-primary/30 to-primary/50 shadow-[0_12px_32px_-18px_hsl(var(--primary)/0.5)]"
            : "bg-gradient-to-br from-primary/30 via-hero-foreground/10 to-primary/15 shadow-[0_10px_28px_-20px_hsl(var(--primary)/0.35)]"
        }`}
      >
        <article
          onClick={handleOpen}
          className="relative cursor-pointer overflow-hidden rounded-[23px] bg-hero transition-transform duration-200 active:scale-[0.99]"
        >
          {/* ====== COVER BAND ====== */}
          <div className="relative h-[88px] w-full overflow-hidden">
            {/* Custom banner if set, else derived from profile photo */}
            {worker.bannerUrl ? (
              <img
                src={worker.bannerUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : worker.profilePhoto ? (
              <img
                src={worker.profilePhoto}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-hero" />
            )}
            {/* Gradient overlay for legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-hero/30 via-hero/55 to-hero" />


            {/* Top meta row */}
            <div className="relative flex items-center justify-between px-3.5 pt-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.18em] ${
                  premium
                    ? "bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/40"
                    : "bg-hero-foreground/15 text-hero-foreground backdrop-blur-md ring-1 ring-hero-foreground/15"
                }`}
              >
                <BadgeIcon className="h-3 w-3" />
                {badgeLabel}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full bg-hero/60 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider backdrop-blur-md ring-1 ${
                  worker.available ? "text-emerald-400 ring-emerald-500/30" : "text-hero-muted ring-hero-foreground/15"
                }`}
              >
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${worker.available ? "bg-emerald-400" : "bg-hero-foreground/40"}`}>
                  {worker.available && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />}
                </span>
                {worker.available ? "Available" : "Busy"}
              </span>
            </div>

          </div>

          {/* ====== AVATAR + IDENTITY ====== */}
          <div className="relative -mt-[52px] flex items-end gap-3 px-3.5">
            <div className="relative shrink-0">
              <Avatar className="relative h-[104px] w-[96px] rounded-[18px] border-[3px] border-hero shadow-xl">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className="rounded-[16px] bg-gradient-to-br from-primary/20 to-hero-foreground/10 text-xl font-extrabold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {worker.verified && (
                <div className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-xl ring-[3px] ring-hero">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                </div>
              )}
            </div>

            {/* Rating chip floats right of avatar */}
            <div className="mb-1 flex flex-1 items-center justify-end">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-amber-500/5 px-2.5 py-1 shadow-md ring-1 ring-amber-500/20 backdrop-blur">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-[13px] font-extrabold leading-none text-hero-foreground">
                  {worker.rating?.toFixed(1) || "—"}
                </span>
                {worker.reviewCount > 0 && (
                  <span className="text-[9.5px] font-semibold leading-none text-hero-muted">
                    {worker.reviewCount} {worker.reviewCount === 1 ? "review" : "reviews"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ====== NAME & PROFESSION ====== */}
          <div className="relative mt-2.5 px-3.5">
            <div className="flex items-start gap-1.5">
              <h3 className="line-clamp-2 bg-gradient-to-br from-hero-foreground via-hero-foreground to-hero-foreground/70 bg-clip-text text-[24px] font-black leading-[1.02] tracking-tight text-transparent">
                {worker.name}
              </h3>
              {worker.verified && <BadgeCheck className="mt-1.5 h-5 w-5 shrink-0 fill-primary text-hero" />}
            </div>
            {worker.profession && (
              <p className="mt-1 truncate text-[13px] font-bold uppercase tracking-wide text-primary">
                {worker.profession}
              </p>
            )}
            {worker.city && (
              <span className="mt-1 inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold text-hero-muted">
                <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                <span className="truncate">{worker.city}</span>
              </span>
            )}
          </div>

          {/* Description */}
          {worker.description && (
            <p className="relative mx-3.5 mt-2.5 line-clamp-2 border-l-2 border-primary/40 pl-2 text-[11.5px] leading-snug text-hero-foreground/75">
              {worker.description}
            </p>
          )}

          {/* ====== STATS ====== */}
          <div className="relative mx-3.5 mt-3 grid grid-cols-2 gap-2">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/85 px-3 py-2.5 text-primary-foreground shadow-md shadow-primary/20">
              <div className="relative flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-hero-foreground/15 backdrop-blur">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[17px] font-black leading-none">
                    {hasDistance ? worker.distance : "—"}
                    {hasDistance && <span className="ml-0.5 text-[10px] font-bold opacity-90">km</span>}
                  </div>
                  <div className="mt-1 text-[8.5px] font-extrabold uppercase tracking-[0.12em] opacity-85">Distance</div>
                </div>
              </div>
            </div>
            <div className="relative flex items-center gap-2.5 rounded-2xl bg-hero-foreground/[0.05] px-3 py-2.5 ring-1 ring-hero-foreground/10">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Briefcase className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[17px] font-black leading-none text-hero-foreground">
                  {worker.experience > 0 ? `${worker.experience}+` : "—"}
                </div>
                <div className="mt-1 text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-hero-muted">Years Exp</div>
              </div>
            </div>
          </div>

          {/* Service areas */}
          {worker.serviceAreas && worker.serviceAreas.length > 0 && (
            <div className="relative mx-3.5 mt-2.5 flex items-center gap-1.5 overflow-hidden">
              <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-[0.15em] text-hero-muted">Serves</span>
              <div className="flex min-w-0 flex-1 gap-1 overflow-hidden">
                {worker.serviceAreas.slice(0, 3).map((area, i) => (
                  <span
                    key={i}
                    className="truncate rounded-full bg-hero-foreground/5 px-2 py-0.5 text-[9.5px] font-bold text-hero-foreground/85 ring-1 ring-hero-foreground/10"
                  >
                    {area}
                  </span>
                ))}
                {worker.serviceAreas.length > 3 && (
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[9.5px] font-extrabold text-primary ring-1 ring-primary/30">
                    +{worker.serviceAreas.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ====== CTA ROW ====== */}
          <div
            className="relative mt-3.5 flex items-center gap-2 border-t border-hero-foreground/8 bg-gradient-to-b from-hero-foreground/[0.02] to-transparent px-3.5 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-11 flex-1 rounded-xl border border-hero-foreground/12 bg-hero-foreground/[0.04] px-2 text-[12px] font-extrabold uppercase tracking-wider text-hero-foreground hover:bg-hero-foreground/10"
              onClick={() => { fireClick(); setPopupOpen(true); }}
            >
              Profile
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
            {isAuthed ? (
              <Button
                size="sm"
                className="h-11 flex-[1.6] rounded-xl bg-gradient-to-r from-primary to-primary/85 px-2 text-[12.5px] font-black uppercase tracking-wider shadow-md shadow-primary/25"
                onClick={() => { fireClick(); setPopupOpen(true); }}
              >
                <Zap className="mr-1 h-4 w-4 fill-current" /> Contact Now
              </Button>
            ) : (
              <AuthRequiredDialog
                title="Log in to contact"
                description="Sign in or create an account to contact this provider."
              >
                <Button
                  size="sm"
                  className="h-11 flex-[1.6] rounded-xl bg-gradient-to-r from-primary to-primary/85 px-2 text-[12.5px] font-black uppercase tracking-wider shadow-md shadow-primary/25"
                >
                  <Zap className="mr-1 h-4 w-4 fill-current" /> Contact Now
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
