import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateDistance, type Coords } from "@/lib/geolocation";

export function useFeaturedWorkerIds() {
  const { data } = useQuery({
    queryKey: ["featured_worker_ids"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("featured_services")
        .select("service_id, priority")
        .eq("is_active", true)
        .order("priority", { ascending: false });
      if (error) throw error;
      return new Set<string>((data || []).map((r: any) => r.service_id as string));
    },
    staleTime: 5 * 60_000,
  });
  return data ?? new Set<string>();
}

export type NativeAd = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  cta_url: string;
  cta_label: string;
  placement: string;
  ad_type: string;
  priority: number;
  target_latitude?: number | null;
  target_longitude?: number | null;
  target_radius_km?: number | null;
};

/**
 * Fetch active ads for a placement. If `userCoords` is provided, ads with
 * geo-targeting (target_latitude/longitude + target_radius_km) are filtered
 * to those whose target circle includes the user. Ads without targeting
 * are always shown (global).
 */
export function useNativeAds(placement: string, userCoords?: Coords | null) {
  const { data } = useQuery({
    queryKey: ["native_ads", placement],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("native_ads")
        .select(
          "id, title, description, image_url, cta_url, cta_label, placement, ad_type, priority, target_latitude, target_longitude, target_radius_km"
        )
        .eq("is_active", true)
        .eq("placement", placement)
        .order("priority", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as NativeAd[];
    },
    staleTime: 5 * 60_000,
  });

  const ads = data ?? [];

  const filtered = ads.filter((ad) => {
    const hasTarget =
      ad.target_latitude != null && ad.target_longitude != null && (ad.target_radius_km ?? 0) > 0;
    if (!hasTarget) return true; // global ad
    if (!userCoords) return false; // geo-targeted ad needs user location
    const dist = calculateDistance(
      userCoords.latitude,
      userCoords.longitude,
      ad.target_latitude as number,
      ad.target_longitude as number
    );
    return dist <= (ad.target_radius_km as number);
  });

  return filtered.slice(0, 3);
}
