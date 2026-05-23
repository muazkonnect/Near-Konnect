import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdDurationDiscount = { duration_days: number; paid_days: number };

export const DEFAULT_DISCOUNTS: AdDurationDiscount[] = [
  { duration_days: 1, paid_days: 1 },
  { duration_days: 7, paid_days: 5 },
  { duration_days: 15, paid_days: 12 },
  { duration_days: 30, paid_days: 22 },
];

export function useAdDiscounts() {
  return useQuery({
    queryKey: ["ad_duration_discounts"],
    queryFn: async (): Promise<AdDurationDiscount[]> => {
      const { data, error } = await (supabase as any)
        .from("ad_duration_discounts")
        .select("duration_days, paid_days")
        .order("duration_days");
      if (error) throw error;
      return (data?.length ? data : DEFAULT_DISCOUNTS) as AdDurationDiscount[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useDiscountFor(durationDays: number) {
  const { data } = useAdDiscounts();
  const row = data?.find((r) => r.duration_days === durationDays);
  const paid = row?.paid_days ?? durationDays;
  return { paidDays: paid, freeDays: Math.max(0, durationDays - paid) };
}

export function useUpsertAdDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: AdDurationDiscount) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("ad_duration_discounts")
        .upsert(
          { duration_days: row.duration_days, paid_days: row.paid_days, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
          { onConflict: "duration_days" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad_duration_discounts"] }),
  });
}
