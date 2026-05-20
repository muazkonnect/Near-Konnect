import AppLayout from "@/components/AppLayout";
import SparksBalanceCard from "@/components/wallet/SparksBalanceCard";
import TransactionRow, { TransactionStatusIcon } from "@/components/wallet/TransactionRow";
import { useWalletTransactions, useUserPaymentRequests } from "@/hooks/useWalletHistory";
import { Sparkles, Receipt, Inbox, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const WalletPage = () => {
  const { data: txs = [], isLoading } = useWalletTransactions();
  const { data: requests = [] } = useUserPaymentRequests();
  const pending = requests.filter((r) => r.status === "pending");

  return (
    <AppLayout title="Sparks Wallet" subtitle="Your platform credits, transactions and payments.">
      <div className="space-y-6">
        <SparksBalanceCard />

        {pending.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-hero-foreground">
            <div className="flex items-center gap-2 text-sm font-semibold text-yellow-300">
              <Clock className="h-4 w-4" /> {pending.length} pending payment{pending.length > 1 ? "s" : ""}
            </div>
            <p className="mt-1 text-xs text-hero-foreground/70">Your top-up request is being reviewed by our team.</p>
          </motion.div>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold"><Receipt className="h-4 w-4 text-primary" /> Recent Activity</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-hero-foreground/[0.04] animate-pulse" />)}
            </div>
          ) : txs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-hero-foreground/20 py-10 text-hero-foreground/50">
              <Inbox className="h-8 w-8" />
              <p className="text-sm">No transactions yet</p>
              <Link to="/wallet/buy" className="mt-2 text-xs font-semibold text-primary hover:underline">Top up your wallet →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {txs.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
            </div>
          )}
        </section>

        {requests.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><Sparkles className="h-4 w-4 text-primary" /> Payment Requests</h2>
            <div className="space-y-2">
              {requests.map((r) => (
                <Link
                  key={r.id}
                  to={`/wallet/payment/${r.id}`}
                  className="flex items-center justify-between rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.03] px-4 py-3 hover:bg-hero-foreground/[0.06] transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold capitalize">
                      {(r.sparks_amount + r.bonus_sparks).toLocaleString()} Sparks · {r.payment_method}
                    </p>
                    <p className="text-[11px] text-hero-foreground/50">{format(new Date(r.created_at), "MMM d, yyyy · HH:mm")}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider">
                    <TransactionStatusIcon status={r.status} />
                    <span className="text-hero-foreground/70">{r.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default WalletPage;
