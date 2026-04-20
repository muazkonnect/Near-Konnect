import { motion } from "framer-motion";
import { Star, MapPin, BadgeCheck, Clock, Sparkles } from "lucide-react";
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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Link
        to={`/worker/${worker.id}`}
        className={`tap-feedback group relative flex items-center gap-3 rounded-2xl border bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md ${
          sponsored ? "ring-2 ring-primary" : ""
        }`}
      >
        {sponsored && (
          <span className="absolute -top-1.5 left-3 z-10 inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
            <Sparkles className="h-2.5 w-2.5" /> Ad
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
