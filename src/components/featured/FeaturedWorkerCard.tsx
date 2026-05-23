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
        <div className="group relative w-[230px] sm:w-[260px] rounded-[20px] p-[1.5px] bg-gradient-to-br from-star via-amber-400/40 to-star/10 shadow-[0_8px_32px_-12px_hsl(45_100%_51%/0.55)]">
          <article
            onClick={handleOpen}
            className="relative cursor-pointer overflow-hidden rounded-[18px] bg-hero/95 backdrop-blur-xl transition-transform duration-300 active:scale-[0.985]"
          >
            {/* Premium glow effects */}
            <div className="pointer-events-none absolute inset-1 overflow-hidden rounded-[17px]">
              <div
                className="absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
                  backgroundSize: "14px 14px",
                }}
              />
              <div
                className="absolute inset-1"
                style={{
                  backgroundImage: `radial-gradient(380px 180px at -10% -20%, rgba(251,191,36,0.38), transparent 60%), radial-gradient(320px 150px at 110% 110%, rgba(251,191,36,0.28), transparent 60%), linear-gradient(90deg, rgba(10,13,10,0.5) 0%, rgba(5,6,5,0.88) 55%, #050605 100%)`,
                }}
              />
              {/* inner glow orbs */}
              <div
                aria-hidden
                className="absolute -left-14 -top-14 h-36 w-36 rounded-full blur-3xl opacity-90 animate-[spark-pulse_5s_ease-in-out_infinite]"
                style={{ background: `radial-gradient(circle, rgba(251,191,36,1), rgba(251,191,36,1) 45%, transparent 70%)` }}
              />
              <div
                aria-hidden
                className="absolute -right-12 -bottom-14 h-32 w-32 rounded-full blur-3xl opacity-80 animate-[spark-pulse_6s_ease-in-out_infinite]"
                style={{ background: `radial-gradient(circle, rgba(251,191,36,1), rgba(251,191,36,1) 45%, transparent 70%)` }}
              />
              {/* center color wash */}
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 h-24 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-50"
                style={{ background: `radial-gradient(ellipse, rgba(251,191,36,0.7), transparent 70%)` }}
              />
              {/* grain/noise overlay */}
              <div
                className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
                }}
              />
              {/* inner top highlight */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              {/* inner bottom shadow line */}
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/60 to-transparent" />
              {/* inset ring */}
              <div className="absolute inset-0 rounded-[17px] ring-1 ring-inset ring-white/[0.08]" />
              {/* aesthetic sheen sweep */}
              <div className="absolute -inset-y-4 -left-1/3 h-[140%] w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_4s_ease-in-out_infinite]" />
            </div>

            {/* Ribbon */}
            <div className="absolute right-0 top-1 z-10 inline-flex items-center gap-1 rounded-bl-2xl bg-gradient-to-r from-star to-amber-500 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-hero shadow-lg">
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
