import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Coords } from "@/lib/geolocation";
import { useWorkers } from "@/hooks/useWorkers";
import type { Worker } from "@/data/mockData";

export type PromotedRow = {
  campaign_id: string;
  worker_id: string;
  user_id: string;
  distance_km: number;
  priority: number;
  ends_at: string;
  avg_rating?: number;
};

export type PromotedWorker = Worker & {
  distance: number;
  campaignId: string;
  priority: number;
};

function useRows(queryKey: any[], rpc: string, args: Record<string, any>, enabled: boolean) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(rpc, args);
      if (error) throw error;
      return (data || []) as PromotedRow[];
    },
    enabled,
    staleTime: 60_000,
  });
}

function join(rows: PromotedRow[], workers: Worker[]): PromotedWorker[] {
  const byId = new Map(workers.map((w) => [w.id, w]));
  const out: PromotedWorker[] = [];
  for (const r of rows) {
    const w = byId.get(r.worker_id);
    if (!w) continue;
    out.push({
      ...w,
      distance: Number(r.distance_km.toFixed(2)),
      campaignId: r.campaign_id,
      priority: r.priority,
    });
  }
  return out;
}

export function usePromotedNearby(coords: Coords | null, radiusKm: number) {
  const { data: workers = [] } = useWorkers();
  const { data: rows = [] } = useRows(
    ["promoted_nearby", "homepage", radiusKm, coords?.latitude, coords?.longitude],
    "get_promoted_workers",
    {
      _viewer_lat: coords?.latitude ?? null,
      _viewer_lng: coords?.longitude ?? null,
      _max_viewer_radius_km: radiusKm,
      _limit: 12,
      _placement: "homepage",
    },
    !!coords
  );
  return useMemo(() => join(rows, workers), [rows, workers]);
}

export function usePromotedTopRated(coords: Coords | null) {
  const { data: workers = [] } = useWorkers();
  const { data: rows = [] } = useRows(
    ["promoted_top_rated", "homepage", coords?.latitude, coords?.longitude],
    "get_top_rated_promoted",
    {
      _viewer_lat: coords?.latitude ?? null,
      _viewer_lng: coords?.longitude ?? null,
      _limit: 12,
      _placement: "homepage",
    },
    !!coords
  );
  return useMemo(() => join(rows, workers), [rows, workers]);
}

const EXPLORE_PAGE_SIZE = 8;
const EXPLORE_DEFAULT_RADIUS_KM = 10;

export function usePromotedExploreInfinite(
  coords: Coords | null,
  opts?: { mainCategory?: string; search?: string; radiusKm?: number | null }
) {
  const { data: workers = [] } = useWorkers();
  const mainCategory = opts?.mainCategory || null;
  const search = opts?.search?.trim() || null;
  // No category → default 10km. With category → respect explicit radius (or null = campaign boundary only).
  const radiusKm = mainCategory ? (opts?.radiusKm ?? null) : (opts?.radiusKm ?? EXPLORE_DEFAULT_RADIUS_KM);
  const q = useInfiniteQuery({
    queryKey: ["promoted_explore", coords?.latitude, coords?.longitude, mainCategory, search, radiusKm],
    enabled: !!coords,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await (supabase as any).rpc("get_promoted_explore", {
        _viewer_lat: coords!.latitude,
        _viewer_lng: coords!.longitude,
        _limit: EXPLORE_PAGE_SIZE,
        _offset: pageParam,
        _exclude_campaign_ids: [],
        _main_category: mainCategory,
        _sub_category: null,
        _search: search,
        _radius_km: radiusKm,
      });
      if (error) throw error;
      return { rows: (data || []) as PromotedRow[], nextOffset: pageParam + EXPLORE_PAGE_SIZE };
    },
    getNextPageParam: (last) => (last.rows.length === EXPLORE_PAGE_SIZE ? last.nextOffset : undefined),
    staleTime: 60_000,
  });

  const flatRows = useMemo(() => {
    const seen = new Set<string>();
    const out: PromotedRow[] = [];
    for (const p of q.data?.pages ?? []) {
      for (const r of p.rows) {
        if (seen.has(r.campaign_id)) continue;
        seen.add(r.campaign_id);
        out.push(r);
      }
    }
    return out;
  }, [q.data]);

  const items = useMemo(() => join(flatRows, workers), [flatRows, workers]);
  return { items, fetchNextPage: q.fetchNextPage, hasNextPage: !!q.hasNextPage, isFetchingNextPage: q.isFetchingNextPage };
}

// Fire-and-forget tracking
export async function trackAdEvent(
  campaignId: string,
  eventType: "impression" | "click",
  placement: string,
  coords?: Coords | null
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const table = eventType === "impression" ? "ad_impressions" : "ad_clicks";
    const point =
      coords && coords.latitude != null
        ? `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`
        : null;
    await (supabase as any).from(table).insert({
      campaign_id: campaignId,
      viewer_user_id: user?.id ?? null,
      viewer_point: point,
      placement,
    });
  } catch {
    /* swallow */
  }
}
