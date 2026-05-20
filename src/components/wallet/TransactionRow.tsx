import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { TransactionRow } from "@/services/walletService";

const REASON_LABELS: Record<string, string> = {
  purchase: "Sparks Purchase",
  admin_added: "Admin Credit",
  admin_grant: "Admin Grant",
  admin_adjust: "Admin Adjustment",
  ad_spent: "Ad Campaign",
  campaign_spend: "Ad Campaign",
  refund: "Refund",
  bonus: "Bonus",
  deduction: "Deduction",
};

const TransactionRow = ({ tx }: { tx: TransactionRow }) => {
  const positive = tx.delta > 0;
  const Icon = positive ? ArrowDownRight : ArrowUpRight;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.03] px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${positive ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{REASON_LABELS[tx.reason] || tx.reason}</p>
          <p className="text-[11px] text-hero-foreground/50 truncate">
            {format(new Date(tx.created_at), "MMM d, yyyy · HH:mm")}
            {tx.notes ? ` · ${tx.notes}` : ""}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${positive ? "text-emerald-400" : "text-rose-400"}`}>
          {positive ? "+" : ""}{tx.delta.toLocaleString()}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-hero-foreground/40">{tx.status}</p>
      </div>
    </div>
  );
};

export const TransactionStatusIcon = ({ status }: { status: string }) => {
  if (status === "approved" || status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "rejected" || status === "cancelled") return <XCircle className="h-4 w-4 text-rose-400" />;
  return <Clock className="h-4 w-4 text-yellow-400" />;
};

export default TransactionRow;
