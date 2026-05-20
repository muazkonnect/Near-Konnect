import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AdCampaign = {
  id: string;
  worker_id: string;
  owner_user_id: string;
  ad_type: "local" | "international";
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
          "id, worker_id, owner_user_id, ad_type, status, duration_days, starts_at, ends_at, sparks_cost, priority, created_at, ad_geo_targets(radius_km, country, city, area)"
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
  return useQuery({
    queryKey: ["campaign_analytics", campaignIds.sort().join(",")],
    queryFn: async () => {
      if (!campaignIds.length) return { byId: {} as Record<string, { impressions: number; clicks: number }> };
      const [imp, clk] = await Promise.all([
        (supabase as any).from("ad_impressions").select("campaign_id").in("campaign_id", campaignIds),
        (supabase as any).from("ad_clicks").select("campaign_id").in("campaign_id", campaignIds),
      ]);
      const byId: Record<string, { impressions: number; clicks: number }> = {};
      campaignIds.forEach((id) => (byId[id] = { impressions: 0, clicks: 0 }));
      (imp.data || []).forEach((r: any) => byId[r.campaign_id] && byId[r.campaign_id].impressions++);
      (clk.data || []).forEach((r: any) => byId[r.campaign_id] && byId[r.campaign_id].clicks++);
      return { byId };
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
  });
  if (error) throw error;
  return data as string;
}
