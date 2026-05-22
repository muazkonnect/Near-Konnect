import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AdPlacement = "homepage" | "explore";

export type AdCampaign = {
  id: string;
  worker_id: string;
  owner_user_id: string;
  ad_type: "local" | "international";
  placement_type: AdPlacement;
  status: "active" | "paused" | "expired" | "rejected";
  duration_days: number;
  starts_at: string;
  ends_at: string;
  sparks_cost: number;
  priority: number;
  created_at: string;
  ad_geo_targets?: { radius_km: number; country: string | null; city: string | null; area: string | null }[];
};

export function useMyCampaigns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`my-campaigns-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ad_campaigns", filter: `owner_user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["my_campaigns", user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ["my_campaigns", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ad_campaigns")
        .select(
          "id, worker_id, owner_user_id, ad_type, placement_type, status, duration_days, starts_at, ends_at, sparks_cost, priority, created_at, ad_geo_targets(radius_km, country, city, area)"
        )
        .eq("owner_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AdCampaign[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useCampaignAnalytics(campaignIds: string[]) {
  const sortedKey = [...campaignIds].sort().join(",");
  return useQuery({
    queryKey: ["campaign_analytics", sortedKey],
    queryFn: async () => {
      const empty = {
        byId: {} as Record<string, { impressions: number; clicks: number }>,
        daily: [] as { date: string; impressions: number; clicks: number }[],
      };
      if (!campaignIds.length) return empty;
      const since = new Date(Date.now() - 14 * 86400_000).toISOString();
      const [imp, clk] = await Promise.all([
        (supabase as any).from("ad_impressions").select("campaign_id, created_at").in("campaign_id", campaignIds).gte("created_at", since),
        (supabase as any).from("ad_clicks").select("campaign_id, created_at").in("campaign_id", campaignIds).gte("created_at", since),
      ]);
      const byId: Record<string, { impressions: number; clicks: number }> = {};
      campaignIds.forEach((id) => (byId[id] = { impressions: 0, clicks: 0 }));
      const dayMap: Record<string, { impressions: number; clicks: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
        dayMap[d] = { impressions: 0, clicks: 0 };
      }
      (imp.data || []).forEach((r: any) => {
        if (byId[r.campaign_id]) byId[r.campaign_id].impressions++;
        const d = r.created_at.slice(0, 10);
        if (dayMap[d]) dayMap[d].impressions++;
      });
      (clk.data || []).forEach((r: any) => {
        if (byId[r.campaign_id]) byId[r.campaign_id].clicks++;
        const d = r.created_at.slice(0, 10);
        if (dayMap[d]) dayMap[d].clicks++;
      });
      const daily = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));
      return { byId, daily };
    },
    enabled: campaignIds.length > 0,
    staleTime: 60_000,
  });
}

export async function setCampaignStatus(campaignId: string, status: "active" | "paused") {
  const { error } = await (supabase as any).rpc("set_campaign_status", {
    _campaign_id: campaignId,
    _status: status,
  });
  if (error) throw error;
}

export async function createCampaign(params: {
  workerId: string;
  adType: "local" | "international";
  placementType: AdPlacement;
  durationDays: number;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  country?: string | null;
  city?: string | null;
  area?: string | null;
}): Promise<string> {
  const { data, error } = await (supabase as any).rpc("create_ad_campaign", {
    _worker_id: params.workerId,
    _ad_type: params.adType,
    _duration_days: params.durationDays,
    _radius_km: params.radiusKm,
    _center_lat: params.centerLat,
    _center_lng: params.centerLng,
    _country: params.country ?? null,
    _city: params.city ?? null,
    _area: params.area ?? null,
    _placement_type: params.placementType,
  });
  if (error) throw error;
  return data as string;
}
