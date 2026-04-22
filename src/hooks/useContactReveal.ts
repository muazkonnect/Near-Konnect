import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

export type RevealStatus = "none" | "pending" | "approved" | "denied";

/**
 * Manage the contact-reveal relationship between the current viewer and a target worker.
 * - `canView` = viewer is the owner, an admin, or has an approved reveal.
 * - `request()` creates a pending request (client → worker).
 * - `decide()` approves/denies a pending request (worker only).
 */
export function useContactReveal(workerUserId: string | undefined) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const qc = useQueryClient();

  const isOwner = !!user && !!workerUserId && user.id === workerUserId;
  const isAdmin = role === "admin";

  const enabled = !!user && !!workerUserId && !isOwner;

  const { data: reveal, isLoading } = useQuery({
    queryKey: ["contact_reveal", workerUserId, user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contact_reveals")
        .select("*")
        .eq("worker_user_id", workerUserId!)
        .eq("client_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; status: RevealStatus; request_message: string | null } | null;
    },
    enabled,
    staleTime: 30_000,
  });

  const status: RevealStatus = (reveal?.status as RevealStatus) || "none";
  const canView = isOwner || isAdmin || status === "approved";

  const requestMutation = useMutation({
    mutationFn: async (message?: string) => {
      if (!user || !workerUserId) throw new Error("Not signed in");
      // If a previous (denied) row exists, reset it to pending; otherwise insert new
      if (reveal?.id) {
        const { error } = await (supabase as any)
          .from("contact_reveals")
          .update({
            status: "pending",
            request_message: message ?? null,
            decided_at: null,
          })
          .eq("id", reveal.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("contact_reveals").insert({
          worker_user_id: workerUserId,
          client_user_id: user.id,
          request_message: message ?? null,
          status: "pending",
        });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      toast.success("Contact request sent");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["contact_reveal", workerUserId, user?.id] }),
        qc.invalidateQueries({ queryKey: ["contact_reveals_inbox", workerUserId] }),
        qc.refetchQueries({ queryKey: ["contact_reveal", workerUserId, user?.id] }),
      ]);
    },
    onError: (e: any) => toast.error(e?.message || "Could not send request"),
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await (supabase as any)
        .from("contact_reveals")
        .update({ status: approve ? "approved" : "denied", decided_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.approve ? "Contact shared" : "Request declined");
      qc.invalidateQueries({ queryKey: ["contact_reveal"] });
      qc.invalidateQueries({ queryKey: ["contact_reveals_inbox"] });
    },
    onError: (e: any) => toast.error(e?.message || "Could not update"),
  });

  return {
    isOwner,
    isAdmin,
    canView,
    status,
    reveal,
    isLoading,
    request: (message?: string) => requestMutation.mutate(message),
    requesting: requestMutation.isPending,
    decide: (id: string, approve: boolean) => decideMutation.mutate({ id, approve }),
    deciding: decideMutation.isPending,
  };
}

/** Worker-side: pending reveal from a specific client (for in-chat Approve/Deny). */
export function usePendingRevealFromClient(workerUserId: string | undefined, clientUserId: string | undefined) {
  const { user } = useAuth();
  const enabled = !!user && !!workerUserId && !!clientUserId && user.id === workerUserId;

  return useQuery({
    queryKey: ["contact_reveals_inbox", workerUserId, clientUserId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contact_reveals")
        .select("*")
        .eq("worker_user_id", workerUserId!)
        .eq("client_user_id", clientUserId!)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; status: RevealStatus } | null;
    },
    enabled,
    staleTime: 15_000,
  });
}
