import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Star, MapPin, BadgeCheck, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import type { Worker } from "@/data/mockData";
import { useI18n } from "@/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trackFeaturedEvent } from "@/hooks/useSponsored";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  worker: Worker & { matchedDistanceMeters?: number };
  index?: number;
  /** Show "Featured" gold-star treatment and track impressions/clicks */
  sponsored?: boolean;
}

const WorkerCard = ({ worker, index = 0, sponsored = false }: Props) => {
  const { user } = useAuth();
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const trackedRef = useRef(false);

  // Fire impression once when at least 50% visible (only for featured cards)
  useEffect(() => {
    if (!sponsored || !cardRef.current || trackedRef.current) return;
    const el = cardRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.5 && !trackedRef.current) {
            trackedRef.current = true;
            trackFeaturedEvent(worker.id, "impression", user?.id);
            obs.disconnect();
          }
        }
      },
      { threshold: [0.5] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [sponsored, worker.id, user?.id]);
  const matchedMeters = worker.matchedDistanceMeters;
  const initials = worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const { t } = useI18n();

  const distanceLabel =
    matchedMeters !== undefined
      ? `${Math.round(matchedMeters)} m`
      : worker.distance > 0
      ? `${worker.distance} ${t("worker.km")}`
      : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Link
        ref={cardRef}
        to={`/worker/${worker.id}`}
        onClick={() => sponsored && trackFeaturedEvent(worker.id, "contact_click", user?.id)}
        className={`tap-feedback group relative flex items-center gap-3 rounded-2xl border bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md ${
          sponsored ? "border-star/40 bg-gradient-to-br from-star/5 to-transparent" : ""
        }`}
      >
        {sponsored && (
          <span className="absolute -top-1.5 left-3 z-10 inline-flex items-center gap-1 rounded-full border border-star/30 bg-card px-1.5 py-0.5 text-[9px] font-bold text-star shadow-sm">
            <Star className="h-2.5 w-2.5 fill-star" /> Featured
          </span>
        )}

        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className="h-14 w-14 rounded-xl bg-muted">
            <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-hero text-sm font-bold text-primary">{initials}</AvatarFallback>
          </Avatar>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card ${
              worker.available ? "bg-primary" : "bg-muted-foreground/40"
            }`}
            aria-label={worker.available ? t("worker.available") : t("worker.busy")}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="truncate text-sm font-bold text-card-foreground">{worker.name}</h3>
            {worker.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
          </div>
          <p className="truncate text-xs text-muted-foreground">{worker.profession}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
              <Star className="h-3 w-3 fill-star text-star" />
              {worker.rating || "—"}
              <span className="font-normal text-muted-foreground">({worker.reviewCount})</span>
            </span>
            {distanceLabel && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" /> {distanceLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {worker.experience}{t("worker.yrs")}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default WorkerCard;
