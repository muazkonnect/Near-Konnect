import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useAuth } from "@/contexts/AuthContext";

const SparksBalanceChip = ({ className = "" }: { className?: string }) => {
  const { user } = useAuth();
  const { balance } = useWallet();
  if (!user) return null;
  return (
    <Link
      to="/wallet"
      className={`inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-bold text-primary backdrop-blur transition-all hover:bg-primary/25 hover:scale-105 ${className}`}
      aria-label="Sparks balance"
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="tabular-nums">{balance.toLocaleString()}</span>
    </Link>
  );
};

export default SparksBalanceChip;
