import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles, Loader2, CheckCircle2, MapPin, X } from "lucide-react";
import { useFeaturedPricing, usePurchaseFeatured } from "@/hooks/useFeatured";
import { useWallet } from "@/contexts/WalletContext";
import { useCategories } from "@/hooks/useCategories";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; workerCategoryId?: string | null };

const DURATIONS: Array<1 | 7 | 15 | 30> = [1, 7, 15, 30];

export default function FeaturedPurchaseDialog({ open, onOpenChange, workerCategoryId }: Props) {
  const { balance } = useWallet();
  const { data: pricing = [] } = useFeaturedPricing();
  const { mainCategories: categories = [] } = useCategories();
  const purchase = usePurchaseFeatured();
  const [duration, setDuration] = useState<1 | 7 | 15 | 30>(7);
  const [categoryId, setCategoryId] = useState<string | null>(workerCategoryId ?? null);

  const priceFor = (d: number) => {
    const r = pricing.find((p) => p.duration_days === d && p.category_id === categoryId)
      ?? pricing.find((p) => p.duration_days === d && p.category_id === null);
    if (!r) return 0;
    return Math.ceil(r.base_sparks * Number(r.multiplier || 1));
  };
  const cost = useMemo(() => priceFor(duration), [duration, pricing, categoryId]);
  const insufficient = balance < cost;

  const handlePurchase = async () => {
    if (insufficient) return toast.error(`Need ${cost} Sparks. Top up first.`);
    try {
      await purchase.mutateAsync({ duration, categoryId });
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
            Show up above standard listings within 3 km of your location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => {
              const p = priceFor(d);
              const active = duration === d;
              return (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`rounded-xl border-2 p-2 text-center transition ${active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                >
                  <div className="text-lg font-extrabold">{d}d</div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                    <Sparkles className="h-2.5 w-2.5" />{p}
                  </div>
                </button>
              );
            })}
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
            <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-bold">{duration} day{duration > 1 ? "s" : ""}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cost</span><Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" />{cost}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Your balance</span><span className={`font-bold ${insufficient ? "text-destructive" : ""}`}>{balance}</span></div>
          </div>

          <ul className="space-y-1 text-xs text-muted-foreground">
            <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />Appears above standard workers, below ads</li>
            <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />Auto-expires after duration</li>
          </ul>

          <Button onClick={handlePurchase} disabled={purchase.isPending || insufficient || cost <= 0} className="w-full" size="lg">
            {purchase.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : insufficient ? "Insufficient Sparks" : `Activate for ${cost} Sparks`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
