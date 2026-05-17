import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, ChevronRight, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useFeaturedServices, trackFeaturedEvent } from "@/hooks/useSponsored";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

type FeaturedWorker = {
  id: string;
  profession: string;
  experience: number;
  verified: boolean;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  priority: number;
};

interface Props {
  title?: string;
  subtitle?: string;
  limit?: number;
  className?: string;
}

const FeaturedWorkersCarousel = ({
  title = "Featured Services",
  subtitle = "Hand-picked top providers",
  limit = 8,
  className = "",
}: Props) => {
  const { user } = useAuth();
  const { data: featuredData } = useFeaturedServices();
  const featured = featuredData || [];
  const [items, setItems] = useState<FeaturedWorker[]>([]);

  useEffect(() => {
    let cancelled = false;
    const ids = featured.map((f) => f.service_id);
    if (ids.length === 0) {
      if (items.length > 0) setItems([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("id, profession, experience, verified, profiles!workers_user_id_fkey_profiles(full_name, avatar_url, city)")
        .in("id", ids);
      if (error || cancelled) return;
      const priorityById = new Map(featured.map((f) => [f.service_id, f.priority]));
      const enriched = (data || []).map((w: any) => ({
        id: w.id,
        profession: w.profession,
        experience: w.experience,
        verified: w.verified,
        full_name: w.profiles?.full_name || "Service Provider",
        avatar_url: w.profiles?.avatar_url ?? null,
        city: w.profiles?.city ?? null,
        priority: priorityById.get(w.id) ?? 0,
      }));
      enriched.sort((a, b) => b.priority - a.priority);
      
      // Simple check to avoid redundant state updates
      const currentIds = items.map(i => i.id).join(',');
      const newIds = enriched.map(i => i.id).join(',');
      if (currentIds !== newIds) {
        setItems(enriched);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [featuredData, limit, items.length]);

  if (items.length === 0) return null;

  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-star text-star" />
            <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
          </div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-3 pb-1">
          {items.map((w, i) => {
            const initials = w.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2);
            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="shrink-0"
              >
                <Link
                  to={`/w/${(w as any).uid || w.id}`}
                  onClick={() => trackFeaturedEvent(w.id, "contact_click", user?.id)}
                  className="group relative flex w-[200px] flex-col items-center gap-2 rounded-2xl border border-star/30 bg-gradient-to-b from-star/5 to-transparent p-3 transition-all hover:-translate-y-0.5 hover:border-star/50 hover:shadow-md"
                >
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full border border-star/30 bg-card px-1.5 py-0.5 text-[9px] font-bold text-star shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-star" /> Featured
                  </span>
                  <Avatar className="mt-1 h-14 w-14 rounded-2xl">
                    <AvatarImage src={w.avatar_url ?? undefined} alt={w.full_name} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-hero text-sm font-bold text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <p className="truncate text-sm font-bold text-card-foreground">{w.full_name}</p>
                      {w.verified && <BadgeCheck className="h-3 w-3 shrink-0 text-primary" />}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground/70">{w.profession}</p>
                    {w.city && <p className="truncate text-[10px] text-muted-foreground/80">{w.city}</p>}
                  </div>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                    {w.experience} yrs <ChevronRight className="h-3 w-3" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedWorkersCarousel;
