import { supabase } from "@/integrations/supabase/client";
const sb = supabase as any;

export type FeaturedPricingRule = {
  id: string;
  duration_days: 1 | 7 | 15 | 30;
  category_id: string | null;
  base_sparks: number;
  multiplier: number;
  active: boolean;
};

export type FeaturedWorker = {
  id: string;
  worker_id: string;
  user_id: string;
  category_id: string | null;
  duration_days: number;
  sparks_cost: number;
  starts_at: string;
  ends_at: string;
  status: "active" | "expired" | "cancelled" | "refunded";
  radius_km: number;
  created_at: string;
};

export type NearbyFeaturedRow = {
  id: string;
  worker_id: string;
  user_id: string;
  category_id: string | null;
  ends_at: string;
  distance_km: number;
  category_match: boolean;
};

export async function fetchFeaturedPricing(): Promise<FeaturedPricingRule[]> {
  const { data, error } = await sb.from("featured_pricing_rules").select("*").eq("active", true).order("duration_days");
  if (error) throw error;
  return data || [];
}

export async function adminFetchAllPricing(): Promise<FeaturedPricingRule[]> {
  const { data, error } = await sb.from("featured_pricing_rules").select("*").order("duration_days");
  if (error) throw error;
  return data || [];
}

export async function adminUpsertPricing(row: Partial<FeaturedPricingRule> & { id?: string }) {
  if (row.id) {
    const { error } = await sb.from("featured_pricing_rules").update(row).eq("id", row.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from("featured_pricing_rules").insert(row);
    if (error) throw error;
  }
}

export async function adminDeletePricing(id: string) {
  const { error } = await sb.from("featured_pricing_rules").delete().eq("id", id);
  if (error) throw error;
}

export async function purchaseFeatured(durationDays: 1 | 7 | 15 | 30, categoryId?: string | null): Promise<FeaturedWorker> {
  const { data, error } = await sb.rpc("purchase_featured", { p_duration_days: durationDays, p_category_id: categoryId ?? null });
  if (error) throw error;
  return data as FeaturedWorker;
}

export async function fetchMyFeatured(userId: string): Promise<FeaturedWorker[]> {
  const { data, error } = await sb.from("featured_workers").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function adminFetchFeatured(): Promise<FeaturedWorker[]> {
  const { data, error } = await sb.from("featured_workers").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return data || [];
}

export async function adminCancelFeatured(id: string) {
  const { error } = await sb.from("featured_workers").update({ status: "cancelled", ends_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function fetchNearbyFeatured(lat: number, lng: number, categoryId?: string | null, limit = 30): Promise<NearbyFeaturedRow[]> {
  const { data, error } = await sb.rpc("nearby_featured_workers", { p_lat: lat, p_lng: lng, p_category_id: categoryId ?? null, p_limit: limit });
  if (error) throw error;
  return (data || []) as NearbyFeaturedRow[];
}
