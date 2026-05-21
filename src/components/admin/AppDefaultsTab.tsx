import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppSettings, useUpdateAppSetting, APP_SETTINGS_DEFAULTS, type AppSettingsMap } from "@/hooks/useAppSettings";
import { Loader2, RotateCcw, Save } from "lucide-react";

type Form = {
  homepage_promoted_radii_km: string; // CSV
  explore_default_radius_km: string;
  discover_default_radius_km: string;
  blood_donors_radius_km: string;
  workers_default_radius_km: string;
};

function toForm(s: AppSettingsMap): Form {
  return {
    homepage_promoted_radii_km: (s.homepage_promoted_radii_km || []).join(","),
    explore_default_radius_km: String(s.explore_default_radius_km),
    discover_default_radius_km: String(s.discover_default_radius_km),
    blood_donors_radius_km: String(s.blood_donors_radius_km),
    workers_default_radius_km: String(s.workers_default_radius_km),
  };
}

export default function AppDefaultsTab() {
  const { data: settings, isLoading } = useAppSettings();
  const update = useUpdateAppSetting();
  const [form, setForm] = useState<Form>(toForm(APP_SETTINGS_DEFAULTS));

  useEffect(() => {
    if (settings) setForm(toForm(settings));
  }, [settings]);

  const save = async () => {
    try {
      const radii = form.homepage_promoted_radii_km
        .split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n) && n > 0);
      if (radii.length < 1) throw new Error("Enter at least one radius (km)");
      const explore = Number(form.explore_default_radius_km);
      const discover = Number(form.discover_default_radius_km);
      const blood = Number(form.blood_donors_radius_km);
      const workers = Number(form.workers_default_radius_km);
      for (const [k, v] of Object.entries({ explore, discover, blood, workers })) {
        if (!Number.isFinite(v) || v <= 0) throw new Error(`Invalid ${k} radius`);
      }
      await Promise.all([
        update.mutateAsync({ key: "homepage_promoted_radii_km", value: radii }),
        update.mutateAsync({ key: "explore_default_radius_km", value: explore }),
        update.mutateAsync({ key: "discover_default_radius_km", value: discover }),
        update.mutateAsync({ key: "blood_donors_radius_km", value: blood }),
        update.mutateAsync({ key: "workers_default_radius_km", value: workers }),
      ]);
      toast.success("Defaults saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const resetDefaults = () => setForm(toForm(APP_SETTINGS_DEFAULTS));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>App Defaults — Radius Settings</CardTitle>
        <CardDescription>
          Control the default radii used across the app: homepage promoted sections, Explore feed,
          Discover initial radius, and nearby blood donors.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Homepage promoted radii (km, comma separated)</Label>
          <Input
            placeholder="e.g. 5,10,15"
            value={form.homepage_promoted_radii_km}
            onChange={(e) => setForm({ ...form, homepage_promoted_radii_km: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            First 3 values are used for the homepage “Within X KM” sections.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Explore default radius (km)</Label>
          <Input
            type="number" min={1} value={form.explore_default_radius_km}
            onChange={(e) => setForm({ ...form, explore_default_radius_km: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Used on Explore feed when no category is selected.</p>
        </div>

        <div className="space-y-2">
          <Label>Discover initial radius (km)</Label>
          <Input
            type="number" min={1} value={form.discover_default_radius_km}
            onChange={(e) => setForm({ ...form, discover_default_radius_km: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Initial radius pre-selected in the Discover page.</p>
        </div>

        <div className="space-y-2">
          <Label>Workers default radius (km)</Label>
          <Input
            type="number" min={1} value={form.workers_default_radius_km}
            onChange={(e) => setForm({ ...form, workers_default_radius_km: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Default radius for worker discovery features.</p>
        </div>

        <div className="space-y-2">
          <Label>Blood donors radius (km)</Label>
          <Input
            type="number" min={1} value={form.blood_donors_radius_km}
            onChange={(e) => setForm({ ...form, blood_donors_radius_km: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Radius for nearby blood requests shown to donors.</p>
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={resetDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset to defaults
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
