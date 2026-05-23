import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Gauge } from "lucide-react";
import { useAppSetting, useUpdateAppSetting } from "@/hooks/useAppSettings";

export default function BloodKonnectTab() {
  const staggerMs = useAppSetting("blood_cards_stagger_ms") || 30;
  const update = useUpdateAppSetting();
  const [val, setVal] = useState<string>(String(staggerMs));

  useEffect(() => { setVal(String(staggerMs)); }, [staggerMs]);

  const save = async () => {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0 || n > 500) {
      toast.error("Enter a value between 0 and 500 ms");
      return;
    }
    try {
      await update.mutateAsync({ key: "blood_cards_stagger_ms", value: n });
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-4 w-4" /> Blood Konnect — Card Animation Speed
        </CardTitle>
        <CardDescription>
          Control the per-card stagger delay for blood donor cards entry animation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-xs">
          <Label>Stagger delay per card (ms)</Label>
          <Input type="number" min={0} max={500} value={val} onChange={(e) => setVal(e.target.value)} />
          <p className="text-xs text-muted-foreground">Lower = faster appearance. Default 30ms.</p>
        </div>
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
