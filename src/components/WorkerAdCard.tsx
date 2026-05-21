import { useEffect, useRef, useState } from "react";
import { Star, BadgeCheck, Award, MapPin, Briefcase, ArrowRight, Sparkles, Zap, MessageSquare, Building2 } from "lucide-react";
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
  const distLabel = hasDistance ? `${worker.distance}` : "—";

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

  return (
    <>
      <div
        ref={cardRef}
        className={`group relative w-[330px] rounded-[20px] p-[1.5px] sm:w-[400px] ${
          premium
            ? "bg-gradient-to-br from-primary via-primary/40 to-primary/10 shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.7)]"
            : "bg-gradient-to-br from-primary/40 via-hero-foreground/15 to-transparent shadow-[0_8px_28px_-14px_hsl(var(--primary)/0.4)]"
        }`}
      >
        <article
          onClick={handleOpen}
          className="relative cursor-pointer overflow-hidden rounded-[18px] bg-hero/95 backdrop-blur-xl transition-transform duration-300 active:scale-[0.985]"
        >
          {/* Decorative glow blobs */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

          {/* Top ribbon */}
          <div
            className={`absolute right-0 top-0 z-10 inline-flex items-center gap-1 rounded-bl-2xl px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] shadow-lg ${
              premium
                ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                : "bg-hero-foreground/15 text-hero-foreground backdrop-blur-md"
            }`}
          >
            {premium ? <Award className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-primary" />}
            {premium ? "Featured" : campaignId ? "Promoted" : "Sponsored"}
          </div>

          {/* Availability pill - top left */}
          <div className="absolute left-2.5 top-2.5 z-10">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shadow-md ring-1 backdrop-blur-md ${
                worker.available
                  ? "bg-primary/90 text-primary-foreground ring-primary/50"
                  : "bg-hero-foreground/30 text-hero-foreground ring-hero-foreground/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  worker.available ? "bg-hero-foreground animate-pulse" : "bg-hero/70"
                }`}
              />
              {worker.available ? "Available" : "Busy"}
            </span>
          </div>

          <div className="relative flex items-stretch gap-3 p-3 pt-9">
            {/* Left: photo column */}
            <div className="relative shrink-0">
              <div className="relative">
                <div className="absolute inset-0 -m-0.5 rounded-2xl bg-gradient-to-br from-primary/60 to-primary/10 opacity-70 blur-[6px]" />
                <Avatar className="relative h-[118px] w-[96px] rounded-2xl border-2 border-hero-foreground/10 shadow-xl">
                  <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                  <AvatarFallback className="rounded-2xl bg-hero-foreground/10 text-lg font-bold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Rating chip */}
              <div className="absolute -bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-primary/40 bg-gradient-to-r from-hero to-hero-foreground/[0.08] px-2 py-1 text-primary shadow-lg ring-1 ring-primary/20">
                <Star className="h-3 w-3 fill-current" />
                <span className="text-[11px] font-extrabold leading-none">{worker.rating?.toFixed(1) || "—"}</span>
                {worker.reviewCount > 0 && (
                  <span className="text-[9px] font-bold leading-none opacity-70">({worker.reviewCount})</span>
                )}
              </div>
            </div>

            {/* Right: details */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Category breadcrumb */}
              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[9px] font-bold uppercase tracking-[0.08em]">
                {worker.mainCategory && (
                  <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-primary ring-1 ring-primary/30">
                    {worker.mainCategory}
                  </span>
                )}
                {worker.subCategory && (
                  <>
                    <span className="text-hero-muted opacity-50">›</span>
                    <span className="text-hero-foreground/90">{worker.subCategory}</span>
                  </>
                )}
              </div>

              {/* Name */}
              <div className="mt-1 flex items-center gap-1">
                <h3 className="truncate bg-gradient-to-r from-hero-foreground to-hero-foreground/80 bg-clip-text text-[17px] font-extrabold leading-tight tracking-tight text-transparent">
                  {worker.name}
                </h3>
                {worker.verified && <BadgeCheck className="h-4 w-4 shrink-0 fill-primary text-hero" />}
              </div>

              {/* Profession */}
              {worker.profession && (
                <p className="truncate text-[12px] font-semibold text-primary/90">
                  {worker.profession}
                </p>
              )}

              {/* Description */}
              {worker.description && (
                <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-hero-foreground/70">
                  {worker.description}
                </p>
              )}

              {/* Meta chips row */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-primary to-primary/70 px-1.5 py-1 text-primary-foreground shadow-md shadow-primary/30">
                  <MapPin className="h-3 w-3" />
                  <span className="text-[11px] font-extrabold leading-none">{distLabel}</span>
                  {hasDistance && <span className="text-[9px] font-bold leading-none opacity-90">km</span>}
                </span>
                {worker.experience > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-hero-foreground/10 px-1.5 py-1 text-hero-foreground ring-1 ring-hero-foreground/10">
                    <Briefcase className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-bold leading-none">{worker.experience}+ yrs</span>
                  </span>
                )}
                {worker.city && (
                  <span className="inline-flex min-w-0 max-w-[110px] items-center gap-1 rounded-lg bg-hero-foreground/10 px-1.5 py-1 text-hero-foreground ring-1 ring-hero-foreground/10">
                    <Building2 className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate text-[10px] font-bold leading-none">{worker.city}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Service areas strip */}
          {worker.serviceAreas && worker.serviceAreas.length > 0 && (
            <div className="relative mx-3 mb-2 flex items-center gap-1 overflow-hidden border-t border-hero-foreground/10 pt-2">
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-hero-muted">Serves:</span>
              <div className="flex min-w-0 flex-1 gap-1 overflow-hidden">
                {worker.serviceAreas.slice(0, 3).map((area, i) => (
                  <span
                    key={i}
                    className="truncate rounded-full bg-hero-foreground/5 px-1.5 py-0.5 text-[9.5px] font-semibold text-hero-foreground/80 ring-1 ring-hero-foreground/10"
                  >
                    {area}
                  </span>
                ))}
                {worker.serviceAreas.length > 3 && (
                  <span className="shrink-0 text-[9px] font-bold text-hero-muted">+{worker.serviceAreas.length - 3}</span>
                )}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div
            className="relative flex items-center gap-2 px-3 pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 flex-1 rounded-lg border border-hero-foreground/10 bg-hero-foreground/5 px-2 text-[11px] font-bold text-hero-foreground backdrop-blur hover:bg-hero-foreground/10"
              onClick={() => { fireClick(); setPopupOpen(true); }}
            >
              <MessageSquare className="mr-1 h-3 w-3" /> View Profile
            </Button>
            {isAuthed ? (
              <Button
                size="sm"
                className="h-8 flex-[1.4] rounded-lg bg-gradient-to-r from-primary to-primary/85 px-2 text-[11px] font-extrabold shadow-lg shadow-primary/30 hover:shadow-primary/50"
                onClick={() => { fireClick(); setPopupOpen(true); }}
              >
                <Zap className="mr-1 h-3 w-3 fill-current" /> Contact Now <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            ) : (
              <AuthRequiredDialog
                title="Log in to contact"
                description="Sign in or create an account to contact this provider."
              >
                <Button
                  size="sm"
                  className="h-8 flex-[1.4] rounded-lg bg-gradient-to-r from-primary to-primary/85 px-2 text-[11px] font-extrabold shadow-lg shadow-primary/30 hover:shadow-primary/50"
                >
                  <Zap className="mr-1 h-3 w-3 fill-current" /> Contact Now <ArrowRight className="ml-1 h-3 w-3" />
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
