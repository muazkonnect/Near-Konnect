import { motion } from "framer-motion";
import { Star, MapPin, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import type { Worker } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  worker: Worker & { matchedDistanceMeters?: number };
  index?: number;
  sponsored?: boolean;
}

const WorkerCard = ({ worker, index = 0, sponsored = false }: Props) => {
  const matchedMeters = worker.matchedDistanceMeters;
  const initials = worker.name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/worker/${worker.id}`}
        className={`tap-feedback block rounded-3xl bg-card p-4 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-premium md:p-5 group ${
          sponsored ? "ring-2 ring-primary" : ""
        }`}
      >
        <div className="flex items-start gap-3 md:gap-4">
          <Avatar className="h-14 w-14 rounded-2xl bg-hero md:h-16 md:w-16">
            <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
            <AvatarFallback className="rounded-2xl bg-hero text-primary font-bold text-base">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <h3 className="max-w-full truncate text-sm font-semibold text-card-foreground md:text-base">{worker.name}</h3>
              {worker.verified && (
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <p className="text-xs text-muted-foreground md:text-sm">{worker.profession}</p>
              <span
                className={`md:hidden inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  worker.available ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {worker.available ? t("worker.available") : t("worker.busy")}
              </span>
            </div>
            <p className="mt-2 inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
              From PKR 1,500
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 md:gap-3 text-[11px] text-muted-foreground md:text-xs">
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                <Star className="w-3 h-3 text-star fill-star" />
                <span className="font-semibold text-card-foreground">{worker.rating}</span>
                <span>({worker.reviewCount})</span>
              </span>
              {(matchedMeters !== undefined || worker.distance > 0) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {matchedMeters !== undefined
                    ? `${Math.round(matchedMeters)} m`
                    : `${worker.distance} ${t("worker.km")}`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {worker.experience} {t("worker.yrs")}
              </span>
            </div>
          </div>
          <div className="hidden shrink-0 self-start md:block">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                worker.available ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {worker.available ? t("worker.available") : t("worker.busy")}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default WorkerCard;