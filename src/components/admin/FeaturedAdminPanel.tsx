import { useState } from "react";
import { Star, Trash2, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  useAdminAllPricing,
  useAdminUpsertPricing,
  useAdminDeletePricing,
  useAdminFeatured,
  useAdminCancelFeatured,
} from "@/hooks/useFeatured";

export default function FeaturedAdminPanel() {
  const { data: pricing = [], isLoading: pricingLoading } = useAdminAllPricing();
  const upsert = useAdminUpsertPricing();
  const del = useAdminDeletePricing();
  const { data: listings = [], isLoading: listingsLoading } = useAdminFeatured();
  const cancel = useAdminCancelFeatured();
  const [draft, setDraft] = useState<{ duration_days: number; base_sparks: number }>({ duration_days: 7, base_sparks: 100 });

  const addRule = async () => {
    try {
      await upsert.mutateAsync({ duration_days: draft.duration_days, base_sparks: draft.base_sparks, multiplier: 1, active: true } as any);
      toast.success("Pricing rule added");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const active = listings.filter((l) => l.status === "active");
  const past = listings.filter((l) => l.status !== "active");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Star className="h-4 w-4 text-amber-500" /> Pricing rules
        </h3>
        {pricingLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ul className="space-y-1">
            {pricing.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs">
                <span>{r.duration_days} days</span>
                <span className="font-semibold">{r.base_sparks} ✦</span>
                <span className={r.active ? "text-emerald-600" : "text-muted-foreground"}>{r.active ? "active" : "off"}</span>
                <Button size="sm" variant="ghost" onClick={() => upsert.mutate({ id: r.id, active: !r.active } as any)}>
                  toggle
                </Button>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
            {pricing.length === 0 && <p className="text-xs text-muted-foreground">No rules yet.</p>}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Days</label>
            <Input
              type="number"
              className="w-20"
              value={draft.duration_days}
              onChange={(e) => setDraft((d) => ({ ...d, duration_days: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Sparks</label>
            <Input
              type="number"
              className="w-24"
              value={draft.base_sparks}
              onChange={(e) => setDraft((d) => ({ ...d, base_sparks: Number(e.target.value) }))}
            />
          </div>
          <Button size="sm" onClick={addRule} disabled={upsert.isPending}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold">Active featured ({active.length})</h3>
        {listingsLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : active.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active featured workers.</p>
        ) : (
          <ul className="space-y-1">
            {active.map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-xs">
                <span className="font-mono truncate">{l.worker_id}</span>
                <span className="text-muted-foreground">ends {new Date(l.ends_at).toLocaleDateString()}</span>
                <span>{l.sparks_cost} ✦</span>
                <Button size="sm" variant="ghost" onClick={() => cancel.mutate(l.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold">Past ({past.length})</h3>
        <ul className="max-h-60 space-y-1 overflow-auto">
          {past.map((l) => (
            <li key={l.id} className="flex items-center justify-between rounded border bg-card px-3 py-2 text-[11px]">
              <span className="font-mono truncate">{l.worker_id}</span>
              <span className="text-muted-foreground">{l.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
