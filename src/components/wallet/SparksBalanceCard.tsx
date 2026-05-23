import { motion } from "framer-motion";
import { Zap, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";

const Stat = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "green" | "red" }) => (
  <div className="flex items-center gap-2 rounded-xl border border-hero-foreground/10 bg-hero-foreground/[0.04] px-3 py-2">
    <Icon className={`h-4 w-4 ${tone === "green" ? "text-emerald-400" : "text-rose-400"}`} />
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-hero-foreground/50">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value.toLocaleString()}</p>
    </div>
  </div>
);

const SparksBalanceCard = () => {
  const { balance, totalPurchased, totalSpent } = useWallet();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent p-6 text-hero-foreground shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.5)]"
    >
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-primary/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-hero-foreground/60">
          <Zap className="h-3.5 w-3.5" /> Sparks Wallet
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-5xl font-extrabold tracking-tight tabular-nums">{balance.toLocaleString()}</p>
            <p className="text-xs text-hero-foreground/60">Available balance</p>
          </div>
          <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/wallet/buy" className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Buy Sparks
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Stat icon={TrendingUp} label="Purchased" value={totalPurchased} tone="green" />
          <Stat icon={TrendingDown} label="Spent" value={totalSpent} tone="red" />
        </div>
      </div>
    </motion.div>
  );
};

export default SparksBalanceCard;
