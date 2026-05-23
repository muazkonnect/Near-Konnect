import { useState, useEffect } from "react";
import { Zap, Save, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSettings, useUpdateAppSetting, APP_SETTINGS_DEFAULTS } from "@/hooks/useAppSettings";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/adminAudit";

type PricingAuditRow = {
  id: string;
  created_at: string;
  admin_user_id: string;
  target_id: string | null;
  metadata: { from?: number; to?: number; currency?: string } | null;
};

function usePricingHistory() {
  return useQuery({
    queryKey: ["spark_pricing_history"],
    queryFn: async (): Promise<PricingAuditRow[]> => {
      const { data, error } = await (supabase as any)
        .from("admin_audit_log")
        .select("id, created_at, admin_user_id, target_id, metadata")
        .eq("target_type", "spark_pricing")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

function useAdminNames(ids: string[]) {
  return useQuery({
    queryKey: ["admin_names", ids.sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      for (const r of data || []) map[r.user_id] = r.full_name || "";
      return map;
    },
  });
}

export default function SparksPricingTab() {
  const { data, isLoading } = useAppSettings();
  const update = useUpdateAppSetting();
  const qc = useQueryClient();
  const [pkr, setPkr] = useState<string>("");
  const [usdt, setUsdt] = useState<string>("");

  const { data: history } = usePricingHistory();
  const adminIds = Array.from(new Set((history || []).map((h) => h.admin_user_id)));
  const { data: nameMap } = useAdminNames(adminIds);

  useEffect(() => {
    if (data) {
      setPkr(String(data.spark_price_pkr ?? APP_SETTINGS_DEFAULTS.spark_price_pkr));
      setUsdt(String(data.spark_price_usdt ?? APP_SETTINGS_DEFAULTS.spark_price_usdt));
    }
  }, [data]);

  const save = async () => {
    const p = Number(pkr);
    const u = Number(usdt);
    if (!p || p <= 0) return toast.error("Enter a valid PKR price");
    if (!u || u <= 0) return toast.error("Enter a valid USDT price");
    const { data: { user } } = await supabase.auth.getUser();
    const adminId = user?.id;
    const prevPkr = Number(data?.spark_price_pkr ?? APP_SETTINGS_DEFAULTS.spark_price_pkr);
    const prevUsdt = Number(data?.spark_price_usdt ?? APP_SETTINGS_DEFAULTS.spark_price_usdt);
    try {
      if (p !== prevPkr) {
        await update.mutateAsync({ key: "spark_price_pkr", value: p });
        if (adminId) await logAdminAction({ adminUserId: adminId, action: "update", targetType: "spark_pricing", targetId: "spark_price_pkr", metadata: { from: prevPkr, to: p, currency: "PKR" } });
      }
      if (u !== prevUsdt) {
        await update.mutateAsync({ key: "spark_price_usdt", value: u });
        if (adminId) await logAdminAction({ adminUserId: adminId, action: "update", targetType: "spark_pricing", targetId: "spark_price_usdt", metadata: { from: prevUsdt, to: u, currency: "USDT" } });
      }
      qc.invalidateQueries({ queryKey: ["spark_pricing_history"] });
      toast.success("Sparks pricing updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
    }
  };

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const sample = 100;
  const fmtVal = (v: number | undefined, ccy?: string) =>
    v == null ? "—" : ccy === "USDT" ? `$${Number(v).toFixed(4)} USDT` : `PKR ${Number(v).toLocaleString()}`;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Sparks Pricing</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Set the price of <strong>1 Spark</strong>. Pakistani users see PKR; everyone else sees USDT. Changes apply across the whole app immediately.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Price per Spark (PKR)</Label>
            <Input type="number" min="0" step="0.01" value={pkr} onChange={(e) => setPkr(e.target.value)} placeholder="10" />
            <p className="text-[11px] text-muted-foreground">{sample} Sparks = PKR {(Number(pkr || 0) * sample).toLocaleString()}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Price per Spark (USDT)</Label>
            <Input type="number" min="0" step="0.0001" value={usdt} onChange={(e) => setUsdt(e.target.value)} placeholder="0.036" />
            <p className="text-[11px] text-muted-foreground">{sample} Sparks = ${(Number(usdt || 0) * sample).toFixed(2)} USDT</p>
          </div>
        </div>

        <Button onClick={save} disabled={update.isPending} className="gap-1.5">
          {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Pricing
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold">Price Change History</h3>
        </div>
        <p className="text-xs text-muted-foreground">Last 20 changes to spark pricing.</p>

        {!history || history.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No changes recorded yet.</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border">
            {history.map((h) => {
              const ccy = h.metadata?.currency || (h.target_id === "spark_price_usdt" ? "USDT" : "PKR");
              const who = nameMap?.[h.admin_user_id] || h.admin_user_id.slice(0, 8);
              return (
                <div key={h.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {ccy} price changed: <span className="text-muted-foreground">{fmtVal(h.metadata?.from, ccy)}</span>{" "}
                      → <span className="text-primary">{fmtVal(h.metadata?.to, ccy)}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">by {who}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
