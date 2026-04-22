import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "manager" | "ads_manager" | "moderator" | "worker" | "customer";

const ROLE_PRIORITY: AppRole[] = ["admin", "manager", "ads_manager", "moderator", "worker", "customer"];

export function useUserRole() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user_role", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      const roles = (data || []).map((r) => r.role) as AppRole[];
      const primary = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? "customer";
      return { primary, roles };
    },
    enabled: !!user,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });

  const roles = data?.roles ?? [];
  const role = data?.primary;
  const isStaff = roles.includes("admin") || roles.includes("manager");
  const hasAnyAdminRole = isStaff || roles.includes("ads_manager") || roles.includes("moderator");

  return { role, roles, isStaff, hasAnyAdminRole, isLoading };
}
