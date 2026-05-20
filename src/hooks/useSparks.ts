import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSparksWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.id;

  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`sparks-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sparks_wallets", filter: `owner_user_id=eq.${uid}` },
        () => queryClient.invalidateQueries({ queryKey: ["sparks_wallet", uid] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, queryClient]);

  return useQuery({
    queryKey: ["sparks_wallet", uid],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sparks_wallets")
        .select("balance, updated_at")
        .eq("owner_user_id", uid!)
        .maybeSingle();
      if (error) throw error;
      return (data?.balance ?? 0) as number;
    },
    enabled: !!uid,
    staleTime: 30_000,
  });
}

export function useSparksTransactions() {
  const { user } = useAuth();
  const uid = user?.id;
  return useQuery({
    queryKey: ["sparks_tx", uid],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sparks_transactions")
        .select("id, delta, reason, notes, created_at, campaign_id")
        .eq("owner_user_id", uid!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!uid,
    staleTime: 60_000,
  });
}

export async function calcSparksCost(
  adType: "local" | "international",
  radiusKm: number,
  durationDays: number
): Promise<number> {
  const { data, error } = await (supabase as any).rpc("calc_sparks_cost", {
    _ad_type: adType,
    _radius_km: radiusKm,
    _duration_days: durationDays,
  });
  if (error) throw error;
  return data as number;
}
