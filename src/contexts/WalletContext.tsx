import { createContext, useContext, useEffect, ReactNode, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWallet, spendSparks as svcSpend, type WalletRow } from "@/services/walletService";

interface WalletContextValue {
  wallet: WalletRow | null;
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  loading: boolean;
  refresh: () => void;
  spend: (amount: number, reason?: string, notes?: string, campaignId?: string) => Promise<number>;
}

const WalletContext = createContext<WalletContextValue>({
  wallet: null, balance: 0, totalPurchased: 0, totalSpent: 0, loading: false,
  refresh: () => {}, spend: async () => 0,
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["wallet", userId],
    queryFn: () => fetchWallet(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`wallet-${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "sparks_wallets", filter: `owner_user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["wallet", userId] });
          qc.invalidateQueries({ queryKey: ["transactions", userId] });
        })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "payment_requests", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["payment_requests", userId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);

  const refresh = useCallback(() => { refetch(); }, [refetch]);

  const spend = useCallback(async (amount: number, reason?: string, notes?: string, campaignId?: string) => {
    const newBalance = await svcSpend(amount, reason, notes, campaignId);
    qc.invalidateQueries({ queryKey: ["wallet", userId] });
    qc.invalidateQueries({ queryKey: ["transactions", userId] });
    return newBalance;
  }, [qc, userId]);

  return (
    <WalletContext.Provider value={{
      wallet: data ?? null,
      balance: data?.balance ?? 0,
      totalPurchased: data?.total_purchased ?? 0,
      totalSpent: data?.total_spent ?? 0,
      loading: isLoading,
      refresh,
      spend,
    }}>
      {children}
    </WalletContext.Provider>
  );
};
