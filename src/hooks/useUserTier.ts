import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDetectedCountry } from "@/hooks/useDetectedCountry";

const sb = supabase as any;

export type TierInfo = {
  tier: 1 | 2 | 3;
  multiplier: number;
  fixedCC: string | null;
  currentCC: string | null;
  loading: boolean;
};

export function useCountryTiers() {
  return useQuery({
    queryKey: ["country_tiers"],
    queryFn: async () => {
      const { data, error } = await sb.from("country_tiers").select("country_code, tier");
      if (error) throw error;
      const map = new Map<string, number>();
      (data ?? []).forEach((r: any) => map.set(String(r.country_code).toUpperCase(), Number(r.tier)));
      return map;
    },
    staleTime: 5 * 60_000,
  });
}

export function useTierSettings() {
  return useQuery({
    queryKey: ["tier_settings"],
    queryFn: async () => {
      const { data, error } = await sb.from("tier_settings").select("tier, multiplier, label").order("tier");
      if (error) throw error;
      const map = new Map<number, { multiplier: number; label: string }>();
      (data ?? []).forEach((r: any) => map.set(Number(r.tier), { multiplier: Number(r.multiplier), label: r.label }));
      return map;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUserTier(): TierInfo {
  const { user } = useAuth();
  const currentCC = useDetectedCountry();
  const { data: profile } = useQuery({
    queryKey: ["profile_country", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await sb
        .from("profiles")
        .select("country_code")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });
  const { data: tiers, isLoading: l1 } = useCountryTiers();
  const { data: settings, isLoading: l2 } = useTierSettings();

  const fixedCC = (profile?.country_code as string | null) ?? null;
  const lookup = (cc: string | null | undefined): number =>
    cc ? tiers?.get(cc.toUpperCase()) ?? 1 : 1;
  const tier = Math.max(lookup(fixedCC), lookup(currentCC)) as 1 | 2 | 3;
  const multiplier = settings?.get(tier)?.multiplier ?? 1;

  return { tier, multiplier, fixedCC, currentCC: currentCC ?? null, loading: l1 || l2 };
}

/** Returns the currentCC string to pass into RPCs (or undefined). */
export function useCurrentCC(): string | undefined {
  const cc = useDetectedCountry();
  return cc || undefined;
}
