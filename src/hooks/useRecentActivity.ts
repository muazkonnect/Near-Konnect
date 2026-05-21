import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ActivityItem = { type: string; text: string; hot?: boolean; ts: string };

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: ["recent_activity", limit],
    queryFn: async (): Promise<ActivityItem[]> => {
      const { data, error } = await (supabase as any).rpc("get_recent_activity", { limit_count: limit });
      if (error) throw error;
      return Array.isArray(data) ? (data as ActivityItem[]) : [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
