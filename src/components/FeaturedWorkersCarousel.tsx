import { useEffect, useState, useMemo } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeaturedServices } from "@/hooks/useSponsored";
import { useNearbyFeaturedWorkerIds } from "@/hooks/useFeatured";
import SteppedCarousel from "@/components/SteppedCarousel";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import FeaturedWorkerCard from "@/components/featured/FeaturedWorkerCard";
import { calculateDistance } from "@/lib/geolocation";

type FeaturedWorker = {
  id: string;
  uid: string | null;
  profession: string;
  experience: number;
  verified: boolean;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  priority: number;
  distance?: number;
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
  const { coords } = useRealtimeLocation();
  const { data: featuredData } = useFeaturedServices();
  const featured = featuredData || [];
  const paidFeaturedIds = useNearbyFeaturedWorkerIds(coords ?? null);
  const [items, setItems] = useState<FeaturedWorker[]>([]);

  const mergedIds = useMemo(() => {
    const set = new Set<string>([...featured.map((f) => f.service_id), ...paidFeaturedIds]);
    return Array.from(set);
  }, [featured, paidFeaturedIds]);

  useEffect(() => {
    let cancelled = false;
    if (mergedIds.length === 0) {
      if (items.length > 0) setItems([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("id, uid, profession, experience, verified, latitude, longitude, profiles!workers_user_id_fkey_profiles(full_name, avatar_url, city)")
        .in("id", mergedIds);
      if (error || cancelled) return;
      const priorityById = new Map(featured.map((f) => [f.service_id, f.priority]));
      const enriched = (data || []).map((w: any) => {
        let distance: number | undefined;
        if (
          coords &&
          typeof w.latitude === "number" &&
          typeof w.longitude === "number"
        ) {
          distance = parseFloat(
            calculateDistance(coords.latitude, coords.longitude, w.latitude, w.longitude).toFixed(1)
          );
        }
        return {
          id: w.id,
          uid: w.uid ?? null,
          profession: w.profession,
          experience: w.experience,
          verified: w.verified,
          full_name: w.profiles?.full_name || "Service Provider",
          avatar_url: w.profiles?.avatar_url ?? null,
          city: w.profiles?.city ?? null,
          priority: priorityById.get(w.id) ?? (paidFeaturedIds.has(w.id) ? 1000 : 0),
          distance,
        };
      });
      enriched.sort((a, b) => b.priority - a.priority);
      const currentIds = items.map(i => i.id).join(',');
      const newIds = enriched.map(i => i.id).join(',');
      if (currentIds !== newIds) setItems(enriched.slice(0, limit));
    })();
    return () => { cancelled = true; };
  }, [mergedIds.join(","), limit, coords?.latitude, coords?.longitude]);

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

      <SteppedCarousel
        className="pb-3"
        trackClassName="px-5"
        dwellMs={2800}
        items={items.map((w, i) => (
          <FeaturedWorkerCard key={w.id} worker={w} index={i} />
        ))}
      />
    </section>
  );
};

export default FeaturedWorkersCarousel;
