import { useEffect, useState } from "react";
import { useAdDiscounts, useUpsertAdDiscount, DEFAULT_DISCOUNTS, type AdDurationDiscount } from "@/hooks/useAdDiscounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Percent, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

const DURATIONS = [1, 7, 15, 30] as const;

export default function DiscountsTab() {
  const { data, isLoading } = useAdDiscounts();
  const upsert = useUpsertAdDiscount();
  const [rows, setRows] = useState<AdDurationDiscount[]>(DEFAULT_DISCOUNTS);

  useEffect(() => {
    if (!data) return;
    const merged = DURATIONS.map(
      (d) => data.find((r) => r.duration_days === d) ?? { duration_days: d, paid_days: d }
    );
    setRows(merged);
  }, [data]);

  const update = (d: number, paid: number) =>
    setRows((rs) => rs.map((r) => (r.duration_days === d ? { ...r, paid_days: paid } : r)));

  const saveOne = async (row: AdDurationDiscount) => {
    if (row.paid_days < 1 || row.paid_days > row.duration_days) {
      toast.error("Paid days must be between 1 and total days");
      return;
    }
    try {
      await upsert.mutateAsync(row);
      toast.success(`Updated ${row.duration_days}-day discount`);
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Percent className="h-6 w-6 text-primary" /> Ad Duration Discounts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set how many days a worker actually pays for each ad duration. The remaining days are given as a discount and shown to the worker at checkout.
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const free = Math.max(0, r.duration_days - r.paid_days);
            const pct = Math.round((free / r.duration_days) * 100);
            return (
              <div key={r.duration_days} className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selected by worker</p>
                    <p className="text-2xl font-extrabold">{r.duration_days} {r.duration_days === 1 ? "day" : "days"}</p>
                  </div>
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                    {pct}% off
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <Label className="text-xs">Paid days</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={r.duration_days}
                      value={r.paid_days}
                      onChange={(e) => update(r.duration_days, Math.max(1, Math.min(r.duration_days, Number(e.target.value) || 1)))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">
                      / {r.duration_days} · <b className="text-foreground">{free}</b> day{free === 1 ? "" : "s"} free
                    </span>
                  </div>
                  <Button onClick={() => saveOne(r)} disabled={upsert.isPending} size="sm" className="mt-2 gap-2">
                    <Save className="h-3.5 w-3.5" /> Save
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <p className="flex items-center gap-2 font-bold text-primary"><Sparkles className="h-4 w-4" /> How it works</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Final cost = <b>per-km rate × radius × paid days</b>. Per-km rates (homepage 3, explore 2) and featured monthly cost are managed in <b>Sparks &amp; Payments</b>.
        </p>
      </div>
    </div>
  );
}
