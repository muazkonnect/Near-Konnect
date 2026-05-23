import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Globe2, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { ALL_COUNTRIES } from "@/lib/countries";

const sb = supabase as any;

type TierRow = { tier: number; multiplier: number; label: string };
type CountryRow = { country_code: string; tier: number };

export default function TierPricingTab() {
  const qc = useQueryClient();

  const { data: tiers = [], isLoading: tl } = useQuery<TierRow[]>({
    queryKey: ["admin_tier_settings"],
    queryFn: async () => {
      const { data, error } = await sb.from("tier_settings").select("tier, multiplier, label").order("tier");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: countries = [], isLoading: cl } = useQuery<CountryRow[]>({
    queryKey: ["admin_country_tiers"],
    queryFn: async () => {
      const { data, error } = await sb.from("country_tiers").select("country_code, tier");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [tierEdits, setTierEdits] = useState<Record<number, number>>({});
  useEffect(() => {
    const next: Record<number, number> = {};
    tiers.forEach((t) => { next[t.tier] = Number(t.multiplier); });
    setTierEdits(next);
  }, [tiers]);

  const saveTier = useMutation({
    mutationFn: async (row: TierRow) => {
      const { error } = await sb.from("tier_settings").update({ multiplier: row.multiplier, updated_at: new Date().toISOString() }).eq("tier", row.tier);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Multiplier saved"); qc.invalidateQueries({ queryKey: ["admin_tier_settings"] }); qc.invalidateQueries({ queryKey: ["tier_settings"] }); },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  const upsertCountry = useMutation({
    mutationFn: async ({ cc, tier }: { cc: string; tier: number }) => {
      if (tier === 1) {
        const { error } = await sb.from("country_tiers").delete().eq("country_code", cc);
        if (error) throw error;
      } else {
        const { error } = await sb.from("country_tiers").upsert({ country_code: cc, tier, updated_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin_country_tiers"] }); qc.invalidateQueries({ queryKey: ["country_tiers"] }); },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  const tierMap = useMemo(() => {
    const m = new Map<string, number>();
    countries.forEach((c) => m.set(c.country_code.toUpperCase(), c.tier));
    return m;
  }, [countries]);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "1" | "2" | "3">("all");

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return ALL_COUNTRIES.filter((c) => {
      const t = tierMap.get(c.code.toUpperCase()) ?? 1;
      if (filter !== "all" && String(t) !== filter) return false;
      if (!ql) return true;
      return c.name.toLowerCase().includes(ql) || c.code.toLowerCase().includes(ql);
    });
  }, [q, filter, tierMap]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Globe2 className="h-6 w-6 text-primary" /> Country Tier Pricing
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Users in Tier 2/3 countries pay a multiplied Sparks cost on verification, featured, and ads. The higher of the user's fixed country and current GPS country is used.
        </p>
      </div>

      {/* Tier multipliers */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tier multipliers</h3>
        {tl ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {tiers.map((t) => (
              <div key={t.tier} className="rounded-xl border p-3">
                <Label className="text-xs text-muted-foreground">{t.label || `Tier ${t.tier}`}</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    value={tierEdits[t.tier] ?? t.multiplier}
                    onChange={(e) => setTierEdits((s) => ({ ...s, [t.tier]: Number(e.target.value) }))}
                  />
                  <Button
                    size="sm"
                    onClick={() => saveTier.mutate({ tier: t.tier, multiplier: tierEdits[t.tier] ?? t.multiplier, label: t.label })}
                    disabled={saveTier.isPending}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">×{tierEdits[t.tier] ?? t.multiplier} base Sparks cost</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Country tier assignments */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Country assignments</h3>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country" className="h-8 w-48 pl-7 text-xs" />
            </div>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="1">Tier 1</SelectItem>
                <SelectItem value="2">Tier 2</SelectItem>
                <SelectItem value="3">Tier 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {cl ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <div className="max-h-[480px] overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr><th className="p-2 text-left">Country</th><th className="p-2 text-left">Code</th><th className="p-2 text-left">Tier</th></tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const t = tierMap.get(c.code.toUpperCase()) ?? 1;
                  return (
                    <tr key={c.code} className="border-t">
                      <td className="p-2"><span className="mr-1">{c.flag}</span>{c.name}</td>
                      <td className="p-2 text-muted-foreground">{c.code}</td>
                      <td className="p-2">
                        <Select
                          value={String(t)}
                          onValueChange={(v) => upsertCountry.mutate({ cc: c.code, tier: Number(v) })}
                        >
                          <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Tier 1</SelectItem>
                            <SelectItem value="2">Tier 2</SelectItem>
                            <SelectItem value="3">Tier 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No matches</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
