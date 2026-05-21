import { useState, useRef } from "react";
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
};

export default function FeaturedWorkerCard({ worker, index = 0 }: Props) {
  const { user } = useAuth();
  const [popupOpen, setPopupOpen] = useState(false);
  const lastClosedRef = useRef(0);
  const initials = worker.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const distLabel = worker.distance && worker.distance > 0 && isFinite(worker.distance) ? `${worker.distance} km` : null;

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
        <div className="group relative w-[260px] rounded-[20px] p-[1.5px] bg-gradient-to-br from-star via-amber-400/40 to-star/10 shadow-[0_8px_32px_-12px_hsl(45_100%_51%/0.55)]">
          <article
            onClick={handleOpen}
            className="relative cursor-pointer overflow-hidden rounded-[18px] bg-hero/95 backdrop-blur-xl transition-transform duration-300 active:scale-[0.985]"
          >
            {/* Decorative glow blobs */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-star/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 left-10 h-24 w-24 rounded-full bg-star/10 blur-2xl" />

            {/* Ribbon */}
            <div className="absolute right-0 top-0 z-10 inline-flex items-center gap-1 rounded-bl-2xl bg-gradient-to-r from-star to-amber-500 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-hero shadow-lg">
              <Award className="h-3 w-3" /> Featured
            </div>

            <div className="relative flex items-stretch gap-3 p-3.5">
              {/* Left: photo column */}
              <div className="relative shrink-1">
                <div className="relative">
                  {/* glow ring */}
                  <div className="absolute inset-0 -m-0.5 rounded-2xl bg-gradient-to-br from-star/60 to-star/10 opacity-70 blur-[6px]" />
                  <Avatar className="relative h-[90px] w-[80px] rounded-2xl border-2 border-star/30 shadow-xl">
                    <AvatarImage src={worker.avatar_url ?? undefined} alt={worker.full_name} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-hero-foreground/10 text-lg font-bold text-star">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Rating overlay chip */}
                <div className="absolute -bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-star/40 bg-gradient-to-r from-hero to-hero-foreground/[0.08] px-2 py-0.5 text-star shadow-lg ring-1 ring-star/20">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-[10px] font-extrabold leading-none">Featured</span>
                </div>
              </div>

              {/* Right: details */}
              <div className="flex min-w-0 flex-1 flex-col">
                {/* Name */}
                <div className="mt-0.5 flex items-center gap-1">
                  <h3 className="truncate bg-gradient-to-r from-hero-foreground to-hero-foreground/80 bg-clip-text text-[15px] font-extrabold leading-tight tracking-tight text-transparent">
                    {worker.full_name}
                  </h3>
                  {worker.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-star text-hero" />}
                </div>

                <p className="truncate text-[11px] text-hero-muted/80">{worker.profession}</p>

                {/* Meta */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {distLabel && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-star to-amber-500 px-2 py-0.5 text-[11px] font-extrabold text-hero shadow-md shadow-star/30">
                      <MapPin className="h-3 w-3" />
                      {distLabel}
                    </span>
                  )}
                  {worker.experience > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-hero-foreground/10 px-1.5 py-0.5 text-hero-foreground ring-1 ring-hero-foreground/10">
                      <Briefcase className="h-3 w-3 text-star" />
                      <span className="text-[10px] font-bold leading-none">{worker.experience}+ yrs</span>
                    </span>
                  )}
                </div>

                {worker.city && (
                  <p className="mt-1 truncate text-[10px] text-hero-muted">{worker.city}</p>
                )}

                {/* CTAs */}
                <div
                  className="mt-3 flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    to={`/w/${worker.uid || worker.id}`}
                    onClick={() => trackFeaturedEvent(worker.id, "contact_click", user?.id)}
                    className="inline-flex h-7 flex-1 items-center justify-center rounded-lg border border-hero-foreground/10 bg-hero-foreground/5 px-2 text-[11px] font-bold text-hero-foreground backdrop-blur hover:bg-hero-foreground/10"
                  >
                    View <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                  {user ? (
                    <button
                      onClick={() => { trackFeaturedEvent(worker.id, "contact_click", user?.id); setPopupOpen(true); }}
                      className="inline-flex h-7 flex-[1.4] items-center justify-center rounded-lg bg-gradient-to-r from-star to-amber-500 px-2 text-[11px] font-extrabold text-hero shadow-lg shadow-star/30 hover:shadow-star/50"
                    >
                      <Zap className="mr-1 h-3 w-3 fill-current" /> Contact
                    </button>
                  ) : (
                    <AuthRequiredDialog
                      title="Log in to contact"
                      description="Sign in or create an account to contact this provider."
                    >
                      <button className="inline-flex h-7 flex-[1.4] items-center justify-center rounded-lg bg-gradient-to-r from-star to-amber-500 px-2 text-[11px] font-extrabold text-hero shadow-lg shadow-star/30 hover:shadow-star/50">
                        <Zap className="mr-1 h-3 w-3 fill-current" /> Contact
                      </button>
                    </AuthRequiredDialog>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>
      </motion.div>
      <WorkerProfilePopup worker={popupWorker as any} open={popupOpen} onOpenChange={handleChange} isAuthed={!!user} />
    </>
  );
}
