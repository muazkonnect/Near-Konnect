import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SpecialAnnouncement = { text: string; expires_at: string | null } | null;

export type AppSettingsMap = {
  homepage_promoted_radii_km: number[];
  explore_default_radius_km: number;
  discover_default_radius_km: number;
  blood_donors_radius_km: number;
  workers_default_radius_km: number;
  featured_default_radius_km: number;
  announcement_messages: string[];
  announcement_ticker_speed_seconds: number;
  featured_cards_dwell_ms: number;
  featured_cards_transition_ms: number;
  special_announcement: SpecialAnnouncement;
};

export const APP_SETTINGS_DEFAULTS: AppSettingsMap = {
  homepage_promoted_radii_km: [5, 10, 15],
  explore_default_radius_km: 10,
  discover_default_radius_km: 3,
  blood_donors_radius_km: 25,
  workers_default_radius_km: 10,
  featured_default_radius_km: 3,
  announcement_messages: [
    "Welcome to Near Konnect — your hyperlocal network",
    "Safety protocols for verified providers updated",
  ],
  announcement_ticker_speed_seconds: 30,
  featured_cards_dwell_ms: 2800,
  featured_cards_transition_ms: 450,
  special_announcement: null,
};

export function useAppSettings() {
  return useQuery({
    queryKey: ["app_settings"],
    queryFn: async (): Promise<AppSettingsMap> => {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("key,value");
      if (error) throw error;
      const map: any = { ...APP_SETTINGS_DEFAULTS };
      for (const row of data || []) {
        map[row.key] = row.value;
      }
      return map as AppSettingsMap;
    },
    staleTime: 5 * 60_000,
  });
}

export function useAppSetting<K extends keyof AppSettingsMap>(key: K): AppSettingsMap[K] {
  const { data } = useAppSettings();
  return (data?.[key] ?? APP_SETTINGS_DEFAULTS[key]) as AppSettingsMap[K];
}

export function useUpdateAppSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: keyof AppSettingsMap; value: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("app_settings")
        .upsert({ key, value, updated_by: user?.id ?? null, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["app_settings"] });
      if (vars.key === "featured_default_radius_km") {
        qc.invalidateQueries({ queryKey: ["nearby_featured"] });
        qc.invalidateQueries({ queryKey: ["my_featured"] });
        qc.invalidateQueries({ queryKey: ["admin_featured_workers"] });
      }
    },
  });
}
