import { useState } from "react";
import { Settings, Sliders, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminProfileTab from "./AdminProfileTab";
import AppDefaultsTab from "./AppDefaultsTab";

type Sub = "defaults" | "account";

const SUBS: { key: Sub; label: string; icon: typeof Sliders }[] = [
  { key: "defaults", label: "App Defaults", icon: Sliders },
  { key: "account", label: "Account", icon: UserCircle },
];

export default function SettingsTab() {
  const [sub, setSub] = useState<Sub>("defaults");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-bold tracking-tight">Settings</h2>
      </d iv>
      <div className="flex flex-wrap gap-2">
        {SUBS.map((s) => {
          const Icon = s.icon;
          const active = sub === s.key;
          return (
            <Button
              key={s.key}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => setSub(s.key)}
              className="gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </Button>
          );
        })}
      </div>
      <div>
        {sub === "defaults" && <AppDefaultsTab />}
        {sub === "account" && <AdminProfileTab />}
      </div>
    </div>
  );
}
