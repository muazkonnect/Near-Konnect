import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ["user_role", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      const roles = (data || []).map((r) => r.role);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("worker")) return "worker";
      return "customer";
    },
    enabled: !!user,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  });

  return { role: role as "customer" | "worker" | "admin" | undefined, isLoading };
}
