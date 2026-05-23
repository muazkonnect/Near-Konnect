import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles, Loader2, CheckCircle2, MapPin, Calendar } from "lucide-react";
import { useFeaturedPricing, usePurchaseFeatured } from "@/hooks/useFeatured";
import { useWallet } from "@/contexts/WalletContext";
import { useCategories } from "@/hooks/useCategories";
import { useWorkerProfile } from "@/hooks/useWorkerProfile";
import { useUserTier, useCurrentCC } from "@/hooks/useUserTier";
import { toast } from "sonner";


type Props = { open: boolean; onOpenChange: (v: boolean) => void; workerCategoryId?: string | null };

export default function FeaturedPurchaseDialog({ open, onOpenChange, workerCategoryId }: Props) {
  const { balance } = useWallet();
  const { data: pricing = [] } = useFeaturedPricing();
  const { mainCategories: categories = [] } = useCategories();
  const { data: workerProfile } = useWorkerProfile();
  const isVerified = !!(workerProfile as any)?.verified;
  const purchase = usePurchaseFeatured();
  const [categoryId, setCategoryId] = useState<string | null>(workerCategoryId ?? null);
  const { tier, multiplier } = useUserTier();
  const currentCC = useCurrentCC();

  const cost = useMemo(() => {
    const r = pricing.find((p) => p.duration_days === 30 && p.category_id === categoryId)
      ?? pricing.find((p) => p.duration_days === 30 && p.category_id === null);
    const base = r ? Math.ceil(r.base_sparks * Number(r.multiplier || 1)) : 30;
    return Math.ceil(base * (multiplier || 1));
  }, [pricing, categoryId, multiplier]);

  const insufficient = balance < cost;

  const handlePurchase = async () => {
    if (!isVerified) return toast.error("Only verified workers can become featured.");
    if (insufficient) return toast.error(`Need ${cost} Sparks. Top up first.`);
    try {
      await purchase.mutateAsync({ duration: 30, categoryId });
      onOpenChange(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-600/10 ring-1 ring-amber-500/40">
            <Star className="h-7 w-7 text-amber-500" fill="currentColor" />
          </div>
          <DialogTitle className="text-center">Become a Featured Worker</DialogTitle>
          <DialogDescription className="text-center">
            Monthly featured placement above standard listings within 3 km.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-2xl border-2 border-primary bg-primary/10 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Monthly Plan</p>
            <p className="mt-1 text-3xl font-extrabold">30 days</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> {cost} Sparks
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Target category (optional)</label>
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All categories</option>
              {categories.filter((c: any) => !c.parent_id).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Radius</span><span className="font-bold">3 km (fixed)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Duration</span><span className="font-bold">30 days</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cost</span><Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" />{cost}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Your balance</span><span className={`font-bold ${insufficient ? "text-destructive" : ""}`}>{balance}</span></div>
          </div>

          <ul className="space-y-1 text-xs text-muted-foreground">
            <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />Appears above standard workers, below ads</li>
            <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />Auto-expires after 30 days</li>
          </ul>

          {!isVerified && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-50/40 p-2.5 text-xs text-amber-900 dark:bg-amber-500/5 dark:text-amber-300">
              Verification required. Verify your worker profile to activate featured placement.
            </div>
          )}
          <Button onClick={handlePurchase} disabled={!isVerified || purchase.isPending || insufficient || cost <= 0} className="w-full" size="lg">
            {purchase.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : !isVerified ? "Verification required" : insufficient ? "Insufficient Sparks" : `Activate for ${cost} Sparks`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
