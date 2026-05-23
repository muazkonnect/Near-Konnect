import { useState, useEffect } from "react";
import { Zap, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppSettings, useUpdateAppSetting, APP_SETTINGS_DEFAULTS } from "@/hooks/useAppSettings";

export default function SparksPricingTab() {
  const { data, isLoading } = useAppSettings();
  const update = useUpdateAppSetting();
  const [pkr, setPkr] = useState<string>("");
  const [usdt, setUsdt] = useState<string>("");

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
    try {
      await update.mutateAsync({ key: "spark_price_pkr", value: p });
      await update.mutateAsync({ key: "spark_price_usdt", value: u });
      toast.success("Sparks pricing updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
    }
  };

  if (isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const sample = 100;
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
            <Input
              type="number"
              min="0"
              step="0.01"
              value={pkr}
              onChange={(e) => setPkr(e.target.value)}
              placeholder="10"
            />
            <p className="text-[11px] text-muted-foreground">{sample} Sparks = PKR {(Number(pkr || 0) * sample).toLocaleString()}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Price per Spark (USDT)</Label>
            <Input
              type="number"
              min="0"
              step="0.0001"
              value={usdt}
              onChange={(e) => setUsdt(e.target.value)}
              placeholder="0.036"
            />
            <p className="text-[11px] text-muted-foreground">{sample} Sparks = ${(Number(usdt || 0) * sample).toFixed(2)} USDT</p>
          </div>
        </div>

        <Button onClick={save} disabled={update.isPending} className="gap-1.5">
          {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Pricing
        </Button>
      </div>
    </div>
  );
}
