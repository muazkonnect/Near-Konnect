import { useState } from "react";
import { lazy, Suspense } from "react";
import { Settings, Sliders, UserCircle, Shield, Megaphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import AdminProfileTab from "./AdminProfileTab";
import AppDefaultsTab from "./AppDefaultsTab";
import AnnouncementBarTab from "./AnnouncementBarTab";

const CategoriesManagementTab = lazy(() => import("./TaxonomyManagementTab"));

type Sub = "defaults" | "announcement" | "categories" | "account";

const SUBS: { key: Sub; label: string; icon: typeof Sliders }[] = [
  { key: "defaults", label: "App Defaults", icon: Sliders },
  { key: "announcement", label: "Announcement Bar", icon: Megaphone },
  { key: "categories", label: "Categories", icon: Shield },
  { key: "account", label: "Account", icon: UserCircle },
];

const Fallback = () => (
  <div className="flex h-32 items-center justify-center">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const CategoriesSection = () => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });
  if (isLoading) return <Fallback />;
  return (
    <Suspense fallback={<Fallback />}>
      <CategoriesManagementTab categories={categories as any} />
    </Suspense>
  );
};

export default function SettingsTab() {
  const [sub, setSub] = useState<Sub>("defaults");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-bold tracking-tight">Settings</h2>
      </div>
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
        {sub === "announcement" && <AnnouncementBarTab />}
        {sub === "categories" && <CategoriesSection />}
        {sub === "account" && <AdminProfileTab />}
      </div>
    </div>
  );
}
