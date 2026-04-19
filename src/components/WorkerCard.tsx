import { motion } from "framer-motion";
import { Star, MapPin, BadgeCheck, Clock, ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { Worker } from "@/data/mockData";
import { useI18n } from "@/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  worker: Worker & { matchedDistanceMeters?: number };
  index?: number;
  sponsored?: boolean;
}

const WorkerCard = ({ worker, index = 0, sponsored = false }: Props) => {
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Link
        to={`/worker/${worker.id}`}
        className={`tap-feedback group relative block overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-premium ${
          sponsored ? "ring-2 ring-primary" : ""
        }`}
      >
        {sponsored && (
          <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            <Sparkles className="h-3 w-3" /> Sponsored
          </span>
        )}

        {/* Dark header strip */}
        <div className="relative overflow-hidden flex items-center justify-between bg-hero px-4 pt-4 pb-12 text-hero-foreground">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
          <span
            className={`relative inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
              worker.available ? "bg-primary text-primary-foreground" : "bg-white/10 text-hero-muted"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${worker.available ? "bg-primary-foreground" : "bg-hero-muted"}`} />
            {worker.available ? t("worker.available") : t("worker.busy")}
          </span>
          <span className="relative grid h-8 w-8 place-items-center rounded-full bg-white/10 text-hero-foreground transition-transform group-hover:rotate-45">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        {/* Body with overlapping avatar */}
        <div className="relative px-4 pb-4">
          <Avatar className="absolute -top-9 left-4 h-16 w-16 rounded-2xl border-4 border-card bg-muted shadow-md">
            <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
            <AvatarFallback className="rounded-2xl bg-hero text-base font-bold text-primary">{initials}</AvatarFallback>
          </Avatar>

          <div className="ml-[5.25rem] min-h-[2.5rem]">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-bold text-card-foreground md:text-base">{worker.name}</h3>
              {worker.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
            </div>
            <p className="truncate text-xs text-muted-foreground md:text-sm">{worker.profession}</p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
              From PKR 1,500
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground">
              <Star className="h-3 w-3 fill-star text-star" />
              {worker.rating || "—"}
              <span className="text-muted-foreground">({worker.reviewCount})</span>
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground md:text-xs">
            {distanceLabel && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {distanceLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {worker.experience} {t("worker.yrs")}
            </span>
            {worker.city && (
              <span className="inline-flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                {worker.city}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default WorkerCard;
