import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTransactions, fetchUserPaymentRequests } from "@/services/walletService";

export function useWalletTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: () => fetchTransactions(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useUserPaymentRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payment_requests", user?.id],
    queryFn: () => fetchUserPaymentRequests(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}
