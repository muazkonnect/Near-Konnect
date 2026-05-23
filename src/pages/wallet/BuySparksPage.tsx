import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Check, Zap, ShieldAlert } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SparksBalanceCard from "@/components/wallet/SparksBalanceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPackages } from "@/services/walletService";
import { usePaymentRegion } from "@/hooks/usePaymentRegion";
import { useState } from "react";
import { useWorkerProfile } from "@/hooks/useWorkerProfile";
import { useMyVerification } from "@/hooks/useVerification";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const BuySparksPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: workerData } = useWorkerProfile();
  const { data: myVerification } = useMyVerification(user?.id);
  const isVerifiedWorker = !!(workerData as any)?.verified;
  const verificationPending = myVerification?.status === "submitted" || myVerification?.status === "resubmit";
  const { data: packages = [], isLoading } = useQuery({ queryKey: ["packages"], queryFn: fetchPackages });
  const { region } = usePaymentRegion();
  const [customSparks, setCustomSparks] = useState("");

  const formatPrice = (pkr: number, usdt: number) =>
    region === "pk" ? `PKR ${pkr.toLocaleString()}` : `$${usdt.toLocaleString()} USDT`;

  const goCustom = () => {
    if (!isVerifiedWorker) {
      toast.error(verificationPending ? "Verification pending. You can buy Sparks after approval." : "Only verified workers can buy Sparks.");
      return;
    }
    const n = parseInt(customSparks);
    if (!n || n < 50) return;
    navigate(`/wallet/buy/custom/checkout?sparks=${n}`);
  };

  const handlePackageClick = (id: string) => {
    if (!isVerifiedWorker) {
      toast.error(verificationPending ? "Verification pending. You can buy Sparks after approval." : "Only verified workers can buy Sparks.");
      return;
    }
    navigate(`/wallet/buy/${id}/checkout`);
  };

  return (
    <AppLayout title="Buy Sparks" subtitle="Choose a package to recharge your wallet.">
      <div className="space-y-6">
        <SparksBalanceCard />

        {!isVerifiedWorker && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
            <div className="flex-1">
              <p className="font-semibold">
                {verificationPending ? "Verification pending" : "Verification required"}
              </p>
              <p className="mt-0.5 text-xs opacity-90">
                {verificationPending
                  ? "Sparks purchases unlock automatically once an admin approves your verification."
                  : "Only verified workers can buy Sparks. Complete worker verification to top up your wallet."}
              </p>
              <Link to="/worker/dashboard" className="mt-2 inline-block text-xs font-semibold underline">
                Go to verification →
              </Link>
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-base font-bold">Packages</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-44 rounded-2xl bg-hero-foreground/[0.04] animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packages.map((p, i) => {
                const featured = i === 1;
                const total = p.sparks + p.bonus_sparks;
                return (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/wallet/buy/${p.id}/checkout`)}
                    className={`relative overflow-hidden rounded-2xl border p-5 text-left text-hero-foreground transition-all ${
                      featured
                        ? "border-primary/50 bg-gradient-to-br from-primary/20 to-primary/5 shadow-[0_10px_30px_-15px_hsl(var(--primary)/0.6)]"
                        : "border-hero-foreground/10 bg-hero-foreground/[0.04] hover:border-primary/30"
                    }`}
                  >
                    {featured && (
                      <span className="absolute top-3 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Popular
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-hero-foreground/60">
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> {p.name}
                    </div>
                    <p className="mt-2 text-3xl font-extrabold tabular-nums">{total.toLocaleString()}</p>
                    <p className="text-xs text-hero-foreground/60">
                      {p.sparks.toLocaleString()} Sparks{p.bonus_sparks > 0 && <span className="text-emerald-400"> + {p.bonus_sparks} bonus</span>}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">{formatPrice(Number(p.price_pkr), Number(p.price_usdt))}</span>
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-5">
          <h3 className="text-sm font-bold">Custom amount</h3>
          <p className="mt-1 text-xs text-hero-foreground/60">Minimum 50 Sparks.</p>
          <div className="mt-3 flex gap-2">
            <Input
              type="number"
              min={50}
              placeholder="e.g. 750"
              value={customSparks}
              onChange={(e) => setCustomSparks(e.target.value)}
              className="bg-hero-foreground/5 border-hero-foreground/15 text-hero-foreground"
            />
            <Button onClick={goCustom} className="rounded-full">
              <Check className="mr-1 h-4 w-4" /> Continue
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default BuySparksPage;
