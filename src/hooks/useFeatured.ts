import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFeaturedPricing, purchaseFeatured, fetchMyFeatured, fetchNearbyFeatured,
  adminFetchAllPricing, adminUpsertPricing, adminDeletePricing,
  adminFetchFeatured, adminCancelFeatured,
} from "@/services/featuredService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useFeaturedPricing() {
  return useQuery({ queryKey: ["featured_pricing"], queryFn: fetchFeaturedPricing, staleTime: 60_000 });
}

export function useMyFeatured(userId?: string | null) {
  return useQuery({
    queryKey: ["my_featured", userId],
    queryFn: () => fetchMyFeatured(userId!),
    enabled: !!userId,
    refetchInterval: 60_000,
  });
}

export function usePurchaseFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ duration, categoryId }: { duration: 1 | 7 | 15 | 30; categoryId?: string | null }) =>
      purchaseFeatured(duration, categoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_featured"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["nearby_featured"] });
      toast.success("Featured listing activated");
    },
    onError: (e: any) => toast.error(e?.message || "Could not activate featured"),
  });
}

export function useNearbyFeatured(coords: { lat: number; lng: number } | null, categoryId?: string | null) {
  return useQuery({
    queryKey: ["nearby_featured", coords?.lat, coords?.lng, categoryId ?? null],
    queryFn: () => fetchNearbyFeatured(coords!.lat, coords!.lng, categoryId ?? null),
    enabled: !!coords,
    staleTime: 60_000,
  });
}

/** Set of worker ids that are sparks-paid featured within radius of the user. */
export function useNearbyFeaturedWorkerIds(
  coords: { latitude: number; longitude: number } | null | undefined,
  categoryId?: string | null
) {
  const { data } = useNearbyFeatured(
    coords ? { lat: coords.latitude, lng: coords.longitude } : null,
    categoryId ?? null
  );
  return new Set<string>((data ?? []).map((r) => r.worker_id));
}

/** Map of worker_id -> { ends_at, distance_km } for nearby paid featured. */
export function useNearbyFeaturedMap(
  coords: { latitude: number; longitude: number } | null | undefined,
  categoryId?: string | null
) {
  const { data } = useNearbyFeatured(
    coords ? { lat: coords.latitude, lng: coords.longitude } : null,
    categoryId ?? null
  );
  const map = new Map<string, { ends_at: string; distance_km: number }>();
  (data ?? []).forEach((r) => map.set(r.worker_id, { ends_at: r.ends_at, distance_km: r.distance_km }));
  return map;
}

// Admin
export function useAdminAllPricing() {
  return useQuery({ queryKey: ["admin_featured_pricing"], queryFn: adminFetchAllPricing });
}
export function useAdminUpsertPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminUpsertPricing,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_featured_pricing"] }); qc.invalidateQueries({ queryKey: ["featured_pricing"] }); },
  });
}
export function useAdminDeletePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDeletePricing,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_featured_pricing"] }),
  });
}
export function useAdminFeatured() {
  return useQuery({ queryKey: ["admin_featured_workers"], queryFn: adminFetchFeatured, refetchInterval: 30_000 });
}
export function useAdminCancelFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminCancelFeatured,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_featured_workers"] }),
  });
}
