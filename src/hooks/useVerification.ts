import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchMyVerification, startVerification, createPersonaInquiry, submitVerification,
  fetchVerificationSettings, adminFetchVerifications, adminDecideVerification, adminRevokeVerification,
  adminUpdateVerificationSettings,
} from "@/services/verificationService";
import { toast } from "sonner";

export function useMyVerification(userId?: string | null) {
  return useQuery({
    queryKey: ["my_verification", userId],
    queryFn: fetchMyVerification,
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useVerificationSettings() {
  return useQuery({
    queryKey: ["verification_settings"],
    queryFn: fetchVerificationSettings,
    staleTime: 60_000,
  });
}

export function useStartAndSubmitVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await startVerification();
      const inquiry = await createPersonaInquiry();
      const row = await submitVerification(inquiry.inquiry_id, inquiry.session_token);
      return { row, inquiry };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_verification"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: any) => toast.error(e?.message || "Verification failed"),
  });
}

export function useAdminVerifications() {
  return useQuery({ queryKey: ["admin_verifications"], queryFn: adminFetchVerifications, refetchInterval: 20_000 });
}

export function useAdminDecideVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: "approved" | "rejected" | "resubmit"; note?: string }) =>
      adminDecideVerification(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_verifications"] });
      qc.invalidateQueries({ queryKey: ["admin_workers"] });
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useAdminRevokeVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workerId, note }: { workerId: string; note?: string }) => adminRevokeVerification(workerId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_verifications"] });
      qc.invalidateQueries({ queryKey: ["admin_workers"] });
    },
  });
}

export function useUpdateVerificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminUpdateVerificationSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verification_settings"] }),
  });
}
