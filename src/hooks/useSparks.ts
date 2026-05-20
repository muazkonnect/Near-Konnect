import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkerProfile } from "@/hooks/useWorkerProfile";

export function useSparksWallet() {
  const { data: worker } = useWorkerProfile();
  const queryClient = useQueryClient();
  const workerId = worker?.id;

  useEffect(() => {
    if (!workerId) return;
    const ch = supabase
      .channel(`sparks-${workerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sparks_wallets", filter: `worker_id=eq.${workerId}` },
        () => queryClient.invalidateQueries({ queryKey: ["sparks_wallet", workerId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [workerId, queryClient]);

  return useQuery({
    queryKey: ["sparks_wallet", workerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sparks_wallets")
        .select("balance, updated_at")
        .eq("worker_id", workerId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.balance ?? 0) as number;
    },
    enabled: !!workerId,
    staleTime: 30_000,
  });
}

export function useSparksTransactions() {
  const { data: worker } = useWorkerProfile();
  const workerId = worker?.id;
  return useQuery({
    queryKey: ["sparks_tx", workerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sparks_transactions")
        .select("id, delta, reason, notes, created_at, campaign_id")
        .eq("worker_id", workerId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!workerId,
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
