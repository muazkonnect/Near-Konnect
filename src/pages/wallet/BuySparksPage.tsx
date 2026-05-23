import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Check } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SparksBalanceCard from "@/components/wallet/SparksBalanceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPackages } from "@/services/walletService";
import { usePaymentRegion } from "@/hooks/usePaymentRegion";
import { useState } from "react";

const BuySparksPage = () => {
  const navigate = useNavigate();
  const { data: packages = [], isLoading } = useQuery({ queryKey: ["packages"], queryFn: fetchPackages });
  const { region } = usePaymentRegion();
  const [customSparks, setCustomSparks] = useState("");

  const formatPrice = (pkr: number, usdt: number) =>
    region === "pk" ? `PKR ${pkr.toLocaleString()}` : `$${usdt.toLocaleString()} USDT`;

  const goCustom = () => {
    const n = parseInt(customSparks);
    if (!n || n < 50) return;
    navigate(`/wallet/buy/custom/checkout?sparks=${n}`);
  };

  return (
    <AppLayout title="Buy Sparks" subtitle="Choose a package to recharge your wallet.">
      <div className="space-y-6">
        <SparksBalanceCard />

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
                      <Zap className="h-3.5 w-3.5 text-primary" /> {p.name}
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
