import { useEffect, useRef, useState } from "react";
import { Star, BadgeCheck, Crown, MapPin, Briefcase, ArrowUpRight, Sparkles, Zap, Shield, Quote } from "lucide-react";
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
        className={`group relative w-[330px] rounded-[22px] p-[1.25px] sm:w-[400px] ${
          premium
            ? "bg-[conic-gradient(from_220deg_at_50%_50%,hsl(var(--primary)),hsl(var(--primary)/0.15),hsl(var(--primary)/0.7),hsl(var(--primary)/0.2),hsl(var(--primary)))] shadow-[0_18px_50px_-18px_hsl(var(--primary)/0.75)]"
            : "bg-gradient-to-br from-primary/45 via-hero-foreground/10 to-primary/25 shadow-[0_14px_36px_-18px_hsl(var(--primary)/0.5)]"
        }`}
      >
        <article
          onClick={handleOpen}
          className="relative cursor-pointer overflow-hidden rounded-[21px] bg-hero/98 backdrop-blur-2xl transition-all duration-300 active:scale-[0.985] hover:shadow-[0_24px_60px_-20px_hsl(var(--primary)/0.45)]"
        >
          {/* Ambient glows */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
          {/* Grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)",
              backgroundSize: "3px 3px",
            }}
          />

          {/* ====== TOP META BAR ====== */}
          <div className="relative flex items-center justify-between px-3.5 pt-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.18em] ${
                premium
                  ? "bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/40"
                  : "bg-hero-foreground/8 text-hero-foreground/80 ring-1 ring-hero-foreground/10"
              }`}
            >
              <BadgeIcon className="h-3 w-3" />
              {badgeLabel}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wider ${
                worker.available ? "text-emerald-400" : "text-hero-muted"
              }`}
            >
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${worker.available ? "bg-emerald-400" : "bg-hero-foreground/40"}`}>
                {worker.available && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
                )}
              </span>
              {worker.available ? "Available now" : "Busy"}
            </span>
          </div>

          {/* ====== HERO: Avatar + Identity ====== */}
          <div className="relative flex gap-3 px-3.5 pt-3">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-[18px] bg-gradient-to-br from-primary via-primary/40 to-transparent opacity-90 blur-[6px]" />
              <Avatar className="relative h-[112px] w-[96px] rounded-[16px] border-2 border-hero-foreground/15 shadow-2xl">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className="rounded-[16px] bg-gradient-to-br from-primary/20 to-hero-foreground/10 text-xl font-extrabold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {worker.verified && (
                <div className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg ring-[2.5px] ring-hero">
                  <Shield className="h-3 w-3 fill-primary-foreground text-primary-foreground" />
                </div>
              )}
              {/* Rating ribbon under avatar */}
              <div className="absolute -bottom-2.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-amber-500/40 bg-hero px-2 py-0.5 shadow-lg">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-[11px] font-extrabold leading-none text-hero-foreground">
                  {worker.rating?.toFixed(1) || "—"}
                </span>
                {worker.reviewCount > 0 && (
                  <span className="text-[9px] font-semibold leading-none text-hero-muted">
                    ({worker.reviewCount})
                  </span>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              {/* Category breadcrumb */}
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

              {/* Name — XL */}
              <div className="mt-1 flex items-start gap-1">
                <h3 className="line-clamp-2 bg-gradient-to-br from-hero-foreground via-hero-foreground to-hero-foreground/70 bg-clip-text text-[23px] font-extrabold leading-[1.05] tracking-tight text-transparent">
                  {worker.name}
                </h3>
                {worker.verified && <BadgeCheck className="mt-1.5 h-5 w-5 shrink-0 fill-primary text-hero" />}
              </div>

              {/* Profession */}
              {worker.profession && (
                <p className="mt-1 truncate text-[12.5px] font-semibold text-primary/95">
                  {worker.profession}
                </p>
              )}

              {/* City line */}
              {worker.city && (
                <span className="mt-1 inline-flex min-w-0 items-center gap-1 text-[10.5px] font-semibold text-hero-muted">
                  <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                  <span className="truncate">{worker.city}</span>
                </span>
              )}
            </div>
          </div>

          {/* Description / pitch */}
          {worker.description && (
            <div className="relative mx-3.5 mt-3 flex gap-2 rounded-xl border border-hero-foreground/8 bg-hero-foreground/[0.03] p-2.5">
              <Quote className="h-3 w-3 shrink-0 text-primary/60" />
              <p className="line-clamp-2 text-[11.5px] leading-snug text-hero-foreground/75">
                {worker.description}
              </p>
            </div>
          )}

          {/* ====== STATS ====== */}
          <div className="relative mx-3.5 mt-3 grid grid-cols-2 gap-2">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/75 px-3 py-2 text-primary-foreground shadow-lg shadow-primary/30">
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-hero-foreground/10 blur-2xl" />
              <div className="relative flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold leading-none">
                    {hasDistance ? worker.distance : "—"}
                    {hasDistance && <span className="ml-0.5 text-[10px] opacity-90">km</span>}
                  </div>
                  <div className="mt-0.5 text-[8.5px] font-bold uppercase tracking-wider opacity-85">Distance</div>
                </div>
              </div>
            </div>
            <div className="relative flex items-center gap-2 rounded-xl bg-hero-foreground/[0.05] px-3 py-2 ring-1 ring-hero-foreground/10">
              <Briefcase className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold leading-none text-hero-foreground">
                  {worker.experience > 0 ? `${worker.experience}+` : "—"}
                </div>
                <div className="mt-0.5 text-[8.5px] font-bold uppercase tracking-wider text-hero-muted">Years Exp</div>
              </div>
            </div>
          </div>

          {/* Service areas */}
          {worker.serviceAreas && worker.serviceAreas.length > 0 && (
            <div className="relative mx-3.5 mt-2.5 flex items-center gap-1.5 overflow-hidden">
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
            className="relative mt-3 flex items-center gap-2 border-t border-hero-foreground/8 bg-gradient-to-b from-hero-foreground/[0.02] to-transparent px-3.5 py-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-10 flex-1 rounded-xl border border-hero-foreground/12 bg-hero-foreground/[0.04] px-2 text-[11.5px] font-bold text-hero-foreground hover:bg-hero-foreground/10"
              onClick={() => { fireClick(); setPopupOpen(true); }}
            >
              View Profile
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
            {isAuthed ? (
              <Button
                size="sm"
                className="group/cta relative h-10 flex-[1.5] overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary to-primary/80 px-2 text-[12px] font-extrabold tracking-wide shadow-lg shadow-primary/40 hover:shadow-primary/60"
                onClick={() => { fireClick(); setPopupOpen(true); }}
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full" />
                <Zap className="mr-1 h-3.5 w-3.5 fill-current" /> Contact Now
              </Button>
            ) : (
              <AuthRequiredDialog
                title="Log in to contact"
                description="Sign in or create an account to contact this provider."
              >
                <Button
                  size="sm"
                  className="group/cta relative h-10 flex-[1.5] overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary to-primary/80 px-2 text-[12px] font-extrabold tracking-wide shadow-lg shadow-primary/40 hover:shadow-primary/60"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full" />
                  <Zap className="mr-1 h-3.5 w-3.5 fill-current" /> Contact Now
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
