import { motion } from "framer-motion";
import { Star, MapPin, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import type { Worker } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  worker: Worker;
  index?: number;
  sponsored?: boolean;
}

const WorkerCard = ({ worker, index = 0, sponsored = false }: Props) => {
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
        className={`tap-feedback block rounded-2xl border bg-card p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-premium md:p-5 group ${
          sponsored ? "border-primary/40 shadow-premium" : ""
        }`}
      >
        <div className="flex items-start gap-3 md:gap-4">
          <Avatar className="h-12 w-12 rounded-xl border-2 border-border transition-colors group-hover:border-primary/30 md:h-14 md:w-14">
            <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-gradient-brand text-primary-foreground font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <h3 className="max-w-full truncate text-sm font-semibold text-card-foreground md:text-base">{worker.name}</h3>
              {sponsored && (
                <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[9px] md:text-[10px]">Sponsored</Badge>
              )}
              {worker.verified && (
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <p className="text-xs text-muted-foreground md:text-sm">{worker.profession}</p>
              <Badge
                variant={worker.available ? "default" : "secondary"}
                className={`md:hidden ${worker.available ? "bg-success/10 text-success border-success/20 font-medium" : ""}`}
              >
                {worker.available ? t("worker.available") : t("worker.busy")}
              </Badge>
            </div>
            <p className="mt-1 text-xs font-semibold text-primary">Starting from PKR 1,500</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 md:gap-3 text-[11px] text-muted-foreground md:text-xs">
              <span className="flex items-center gap-1 px-2 py-0.5 bg-star/10 rounded-full">
                <Star className="w-3 h-3 text-star fill-star" />
                <span className="font-semibold text-card-foreground">{worker.rating}</span>
                <span>({worker.reviewCount})</span>
              </span>
              {worker.distance > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {worker.distance} {t("worker.km")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {worker.experience} {t("worker.yrs")}
              </span>
            </div>
          </div>
          <div className="hidden shrink-0 self-start md:block">
            <Badge
              variant={worker.available ? "default" : "secondary"}
              className={worker.available ? "bg-success/10 text-success border-success/20 font-medium" : ""}
            >
              {worker.available ? t("worker.available") : t("worker.busy")}
            </Badge>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default WorkerCard;