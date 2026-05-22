import { useState, useRef, useEffect, useMemo } from "react";
import { Star, BadgeCheck, MapPin, Briefcase, ArrowRight, Zap, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";
import WorkerProfilePopup from "@/components/WorkerProfilePopup";
import { trackFeaturedEvent } from "@/hooks/useSponsored";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  worker: {
    id: string;
    uid?: string;
    full_name: string;
    profession: string;
    experience: number;
    verified: boolean;
    avatar_url: string | null;
    city: string | null;
    distance?: number;
  };
  index?: number;
  endsAt?: string | null;
};

export default function FeaturedWorkerCard({ worker, index = 0, endsAt }: Props) {
  const { user } = useAuth();
  const [popupOpen, setPopupOpen] = useState(false);
  const lastClosedRef = useRef(0);
  const initials = worker.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const distLabel = worker.distance && worker.distance > 0 && isFinite(worker.distance) ? `${worker.distance} km` : null;

  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [endsAt]);
  const remaining = useMemo(() => {
    if (!endsAt) return null;
    const ms = new Date(endsAt).getTime() - nowTick;
    if (ms <= 0) return "ended";
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }, [endsAt, nowTick]);

  const handleOpen = () => {
    if (popupOpen) return;
    if (Date.now() - lastClosedRef.current < 300) return;
    trackFeaturedEvent(worker.id, "contact_click", user?.id);
    setPopupOpen(true);
  };
  const handleChange = (o: boolean) => {
    if (!o) lastClosedRef.current = Date.now();
    setPopupOpen(o);
  };

  // Map to Worker type for popup
  const popupWorker = {
    id: worker.id,
    uid: worker.uid,
    name: worker.full_name,
    profession: worker.profession,
    experience: worker.experience,
    verified: worker.verified,
    profilePhoto: worker.avatar_url ?? undefined,
    distance: worker.distance ?? 1,
    rating: 0,
    reviewCount: 1,
    available: true,
    mainCategory: undefined,
    subCategory: undefined,
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="shrink-1"
      >
        {/* Golden gradient border wrapper */}
        <div className="group relative w-[230px] sm:w-[260px] rounded-[20px] p-[1.5px] bg-gradient-to-br from-star via-amber-400/40 to-star/10 shadow-[0_8px_32px_-12px_hsl(45_100%_51%/0.55)]">
          <article
            onClick={handleOpen}
            className="relative cursor-pointer overflow-hidden rounded-[18px] bg-hero/95 backdrop-blur-xl transition-transform duration-300 active:scale-[0.985]"
          >
            {/* Decorative glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-star/20 blur-3xl" />

            {/* Ribbon */}
            <div className="absolute right-0 top-0 z-10 inline-flex items-center gap-1 rounded-bl-2xl bg-gradient-to-r from-star to-amber-500 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-hero shadow-lg">
              <Award className="h-2.5 w-2.5" /> Featured
            </div>

            <div className="relative flex flex-col gap-2.5 p-3 pt-7">
              {/* Header row: avatar + name */}
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 -m-0.5 rounded-2xl bg-gradient-to-br from-star/60 to-star/10 opacity-70 blur-[6px]" />
                  <Avatar className="relative h-14 w-14 rounded-2xl border-2 border-star/30 shadow-xl">
                    <AvatarImage src={worker.avatar_url ?? undefined} alt={worker.full_name} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-hero-foreground/10 text-sm font-bold text-star">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h3 className="truncate text-[14px] font-extrabold leading-tight tracking-tight text-hero-foreground">
                      {worker.full_name}
                    </h3>
                    {worker.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-star text-hero" />}
                  </div>
                  <p className="truncate text-[11px] text-hero-muted/80">{worker.profession}</p>
                  {worker.city && (
                    <p className="mt-0.5 truncate text-[10px] text-hero-muted">{worker.city}</p>
                  )}
                </div>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {distLabel && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-star to-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-hero shadow-md shadow-star/30">
                    <MapPin className="h-3 w-3" />
                    {distLabel}
                  </span>
                )}
                {worker.experience > 1 && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-hero-foreground/10 px-2 py-0.5 text-hero-foreground ring-1 ring-hero-foreground/10">
                    <Briefcase className="h-3 w-3 text-star" />
                    <span className="text-[10px] font-bold leading-none">{worker.experience}+ yrs</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-lg bg-star/10 px-2 py-0.5 text-star ring-1 ring-star/30">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-[10px] font-extrabold leading-none">Premium</span>
                </span>
                {remaining && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-hero-foreground/5 px-2 py-0.5 text-hero-foreground/80 ring-1 ring-hero-foreground/10">
                    <span className="text-[10px] font-bold leading-none">{remaining === "ended" ? "ended" : `${remaining} left`}</span>
                  </span>
                )}
              </div>

              {/* CTAs */}
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Link
                  to={`/w/${worker.uid || worker.id}`}
                  onClick={() => trackFeaturedEvent(worker.id, "contact_click", user?.id)}
                  className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-hero-foreground/10 bg-hero-foreground/5 px-2 text-[11px] font-bold text-hero-foreground hover:bg-hero-foreground/10"
                >
                  View <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
                {user ? (
                  <button
                    onClick={() => { trackFeaturedEvent(worker.id, "contact_click", user?.id); setPopupOpen(true); }}
                    className="inline-flex h-8 flex-[1.4] items-center justify-center rounded-lg bg-gradient-to-r from-star to-amber-500 px-2 text-[11px] font-extrabold text-hero shadow-lg shadow-star/30 hover:shadow-star/50"
                  >
                    <Zap className="mr-1 h-3 w-3 fill-current" /> Contact
                  </button>
                ) : (
                  <AuthRequiredDialog
                    title="Log in to contact"
                    description="Sign in or create an account to contact this provider."
                  >
                    <button className="inline-flex h-8 flex-[1.4] items-center justify-center rounded-lg bg-gradient-to-r from-star to-amber-500 px-2 text-[11px] font-extrabold text-hero shadow-lg shadow-star/30 hover:shadow-star/50">
                      <Zap className="mr-1 h-3 w-3 fill-current" /> Contact
                    </button>
                  </AuthRequiredDialog>
                )}
              </div>
            </div>
          </article>
        </div>
      </motion.div>
      <WorkerProfilePopup worker={popupWorker as any} open={popupOpen} onOpenChange={handleChange} isAuthed={!!user} />
    </>
  );
}
