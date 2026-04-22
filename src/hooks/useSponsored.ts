import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
};

export function useNativeAds(placement: string) {
  const { data } = useQuery({
    queryKey: ["native_ads", placement],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("native_ads")
        .select("id, title, description, image_url, cta_url, cta_label, placement, ad_type, priority")
        .eq("is_active", true)
        .eq("placement", placement)
        .order("priority", { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data || []) as NativeAd[];
    },
    staleTime: 5 * 60_000,
  });
  return data ?? [];
}
