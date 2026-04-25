import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Set of user_ids that hold the `admin` role.
 * Used to exclude admin accounts from public worker listings — admins
 * are never treated as workers in NearKonnect.
 */
export function useAdminUserIds() {
  const { data } = useQuery({
    queryKey: ["admin_user_ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin" as any);
      if (error) {
        console.warn("Failed to load admin user_ids", error.message);
        return new Set<string>();
      }
      return new Set<string>((data || []).map((r: any) => r.user_id));
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
  return data ?? new Set<string>();
}
