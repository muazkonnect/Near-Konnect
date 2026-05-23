import { useMemo, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  Shield,
  Trash2,
  CheckCircle,
  XCircle,
  Heart,
  Droplet,
  Megaphone,
  Star,
  LayoutDashboard,
  LogOut,
  Crown,
  UserCog,
  Home,
  Zap,
  Sliders,
  Search,
  Bell,
  ScrollText,
  Receipt,
  Percent,


} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
const UsersManagementTab = lazy(() => import("@/components/admin/UsersManagementTab"));
const SettingsTab = lazy(() => import("@/components/admin/SettingsTab"));
const TaxonomyManagementTab = lazy(() => import("@/components/admin/TaxonomyManagementTab"));

const SparksAdminTab = lazy(() => import("@/components/admin/SparksAdminTab"));
const FeaturedManagementTab = lazy(() => import("@/components/admin/FeaturedManagementTab"));
const VerificationsAdminPanel = lazy(() => import("@/components/admin/VerificationsAdminPanel"));
const RunningAdsPanel = lazy(() => import("@/components/admin/SparksAdminTab").then((m) => ({ default: m.CampaignsPanel })));
const AuditLogTab = lazy(() => import("@/components/admin/AuditLogTab"));
const PushBroadcastTab = lazy(() => import("@/components/admin/PushBroadcastTab"));
import EditWorkerDialog from "@/components/admin/EditWorkerDialog";
import AvatarResetsTab from "@/components/admin/AvatarResetsTab";
import LocationChangeRequestsTab from "@/components/admin/LocationChangeRequestsTab";
const FinanceTab = lazy(() => import("@/components/admin/FinanceTab"));
const DiscountsTab = lazy(() => import("@/components/admin/DiscountsTab"));
const TierPricingTab = lazy(() => import("@/components/admin/TierPricingTab"));


const TabFallback = () => (
  <div className="flex h-40 items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);
import { Pencil, BadgeCheck, Globe2 } from "lucide-react";
import { logAdminAction } from "@/lib/adminAudit";

type TabKey = "overview" | "workers" | "users" | "categories" | "donors" | "featured" | "verifications" | "running_ads" | "sparks" | "finance" | "discounts" | "tiers" | "push" | "audit" | "settings" | "avatar_resets" | "location_requests";


const NAV_ITEMS: { key: TabKey; label: string; icon: typeof LayoutDashboard; group: "Manage" | "Operations" | "System" }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, group: "Manage" },
  { key: "workers", label: "Workers", icon: Briefcase, group: "Manage" },
  { key: "users", label: "Users", icon: Users, group: "Manage" },
  { key: "categories", label: "Categories", icon: Shield, group: "Manage" },
  { key: "donors", label: "Blood Donors", icon: Heart, group: "Manage" },
  { key: "featured", label: "Featured", icon: Star, group: "Operations" },
  { key: "verifications", label: "Verifications", icon: BadgeCheck, group: "Operations" },
  { key: "running_ads", label: "Running Ads", icon: Megaphone, group: "Operations" },
  { key: "sparks", label: "Sparks & Payments", icon: Zap, group: "Operations" },
  { key: "finance", label: "Finance & Invoices", icon: Receipt, group: "Operations" },
  { key: "discounts", label: "Discounts", icon: Percent, group: "Operations" },
  { key: "tiers", label: "Country Tiers", icon: Globe2, group: "Operations" },


  { key: "push", label: "Push Broadcast", icon: Bell, group: "Operations" },
  { key: "avatar_resets", label: "Avatar Resets", icon: UserCog, group: "Operations" },
  { key: "location_requests", label: "Location Requests", icon: UserCog, group: "Operations" },
  { key: "audit", label: "Audit & Access", icon: ScrollText, group: "System" },
  { key: "settings", label: "Settings", icon: Sliders, group: "System" },
];

const AdminSidebar = ({ tab, setTab, onSignOut, pendingMap }: { tab: TabKey; setTab: (t: TabKey) => void; onSignOut: () => void; pendingMap: Partial<Record<TabKey, number>> }) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Sidebar collapsible="icon" className="border-r border-hero-foreground/10 [&>div]:bg-hero [&>div]:text-hero-foreground">
      <SidebarHeader className="px-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)]">
            <Crown className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-hero-foreground">Admin</p>
              <p className="truncate text-[11px] text-hero-foreground/60">Control center</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {(["Manage", "Operations", "System"] as const).map((grp) => (
          <SidebarGroup key={grp}>
            <SidebarGroupLabel className="text-hero-foreground/50">{grp}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.filter((n) => n.group === grp).map((it) => {
                  const active = tab === it.key;
                  const Icon = it.icon;
                  const count = pendingMap[it.key] ?? 0;
                  return (
                    <SidebarMenuItem key={it.key}>
                      <SidebarMenuButton
                        onClick={() => setTab(it.key)}
                        className={
                          active
                            ? "bg-primary/15 font-semibold text-hero-foreground hover:bg-primary/20 hover:text-hero-foreground"
                            : "text-hero-foreground/70 hover:bg-hero-foreground/10 hover:text-hero-foreground"
                        }
                      >
                        <span className="relative">
                          <Icon className="h-4 w-4" />
                          {count > 0 && collapsed && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-hero" />
                          )}
                        </span>
                        <span className="flex-1 truncate">{it.label}</span>
                        {count > 0 && !collapsed && (
                          <Badge className="h-5 min-w-5 px-1.5 text-[10px] font-bold bg-destructive text-destructive-foreground">
                            {count > 99 ? "99+" : count}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-2 space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-hero-foreground/70 hover:bg-hero-foreground/10 hover:text-hero-foreground">
              <Link to="/">
                <Home className="h-4 w-4" />
                <span>Back to Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSignOut} className="text-destructive/80 hover:bg-destructive/15 hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  accent,
  className = "",
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  accent?: boolean;
  className?: string;
  onClick?: () => void;
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    whileTap={{ scale: 0.985 }}
    className={`group relative overflow-hidden rounded-3xl border p-4 sm:p-5 text-left transition-all ${
      accent
        ? "border-primary/40 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent shadow-[0_12px_32px_-12px_hsl(var(--primary)/0.5)]"
        : "border-hero-foreground/10 bg-hero-foreground/[0.04] hover:border-hero-foreground/20"
    } ${className}`}
  >
    <div className="flex items-start justify-between gap-2">
      <p className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${accent ? "text-hero-foreground/80" : "text-hero-foreground/60"}`}>
        {label}
      </p>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          accent ? "bg-primary/25 text-primary" : "bg-hero-foreground/10 text-hero-foreground/70"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <p className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-hero-foreground">{value}</p>
  </motion.button>
);

const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="mb-4 sm:mb-6 flex items-end justify-between gap-3 flex-wrap">
    <div>
      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-hero-foreground">{title}</h2>
      {subtitle && <p className="text-xs sm:text-sm text-hero-foreground/60 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { role, isStaff, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("overview");
  const [featureWorkerId, setFeatureWorkerId] = useState("");
  const [featurePriority, setFeaturePriority] = useState("100");
  const [donorFilter, setDonorFilter] = useState("");
  const [editingWorker, setEditingWorker] = useState<any | null>(null);
  const [workerSearch, setWorkerSearch] = useState("");

  // Apply admin-shell scope to body so portaled popovers/dialogs inherit dark theme
  useEffect(() => {
    document.body.classList.add("admin-shell");
    return () => { document.body.classList.remove("admin-shell"); };
  }, []);

  useEffect(() => {
    if (!authLoading && !roleLoading && !isStaff) {
      toast.error("Access denied. Staff only.");
      navigate("/");
    }
  }, [authLoading, roleLoading, isStaff, navigate]);

  const { data: workers = [] } = useQuery({
    queryKey: ["admin_workers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*, profiles(full_name, phone, avatar_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  // Realtime: refresh workers/profiles/roles lists when records change
  useEffect(() => {
    if (!isStaff) return;
    const channel = supabase
      .channel(`admin-realtime-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workers" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin_workers"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin_workers"] });
        queryClient.invalidateQueries({ queryKey: ["admin_profiles"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin_user_roles"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "service_categories" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isStaff, queryClient]);

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["admin_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const { data: allUserRoles = [] } = useQuery({
    queryKey: ["admin_user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data as { user_id: string; role: string }[];
    },
    enabled: isStaff,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_categories").select("*").order("name");
      if (error) throw error;
      return data as { id: string; name: string; icon: string; parent_id: string | null; created_at: string }[];
    },
    enabled: isStaff,
  });

  const { data: bloodDonors = [] } = useQuery({
    queryKey: ["admin_blood_donors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("is_blood_donor", true).order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const { data: featuredServices = [] } = useQuery({
    queryKey: ["admin_featured_services"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("featured_services")
        .select("id, service_id, owner_user_id, priority, is_active, created_at")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const { data: nativeAds = [] } = useQuery({
    queryKey: ["admin_native_ads"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("native_ads")
        .select(
          "id, title, image_url, cta_url, cta_label, placement, ad_type, priority, is_active, created_at, target_latitude, target_longitude, target_radius_km, description"
        )
        .order("priority", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  // Pending action counts for overview
  const { data: pending } = useQuery({
    queryKey: ["admin_pending_counts"],
    queryFn: async () => {
      const head = { count: "exact" as const, head: true };
      const [ver, feat, pay, avt, loc] = await Promise.all([
        (supabase as any).from("worker_verifications").select("id", head).eq("status", "pending"),
        (supabase as any).from("featured_requests").select("id", head).eq("status", "pending"),
        (supabase as any).from("payment_requests").select("id", head).eq("status", "pending"),
        (supabase as any).from("avatar_reset_requests").select("id", head).eq("status", "pending"),
        (supabase as any).from("worker_location_change_requests").select("id", head).eq("status", "pending"),
      ]);
      return {
        verifications: ver.count ?? 0,
        featured: feat.count ?? 0,
        payments: pay.count ?? 0,
        avatars: avt.count ?? 0,
        locations: loc.count ?? 0,
      };
    },
    enabled: isStaff,
    refetchInterval: 60_000,
  });

  // New signups in last 24h
  const newUsers24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return (allProfiles as any[]).filter((p) => new Date(p.created_at).getTime() >= cutoff).length;
  }, [allProfiles]);


  const featuredMap = useMemo(
    () => new Map((featuredServices as any[]).map((row) => [row.service_id, row])),
    [featuredServices]
  );

  // ===== Mutations =====
  const toggleVerified = async (workerId: string, current: boolean) => {
    const { error } = await supabase.from("workers").update({ verified: !current }).eq("id", workerId);
    if (error) return toast.error("Failed to update verification");
    queryClient.invalidateQueries({ queryKey: ["admin_workers"] });
    queryClient.invalidateQueries({ queryKey: ["workers"] });
    toast.success(`Worker ${!current ? "verified" : "unverified"}`);
    if (user?.id) logAdminAction({ adminUserId: user.id, action: !current ? "worker.verify" : "worker.unverify", targetType: "worker", targetId: workerId });
  };

  const toggleAvailable = async (workerId: string, current: boolean) => {
    const { error } = await supabase.from("workers").update({ available: !current }).eq("id", workerId);
    if (error) {
      toast.error("Failed to update worker visibility");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin_workers"] });
    queryClient.invalidateQueries({ queryKey: ["workers"] });
    toast.success(!current ? "Worker is now visible" : "Worker is now hidden");
    if (user?.id) logAdminAction({ adminUserId: user.id, action: !current ? "worker.unhide" : "worker.hide", targetType: "worker", targetId: workerId });
  };

  const deleteWorker = async (workerId: string) => {
    if (!confirm("Permanently remove this worker profile? This will also remove their worker role and listing.")) return;
    
    const worker = (workers as any[]).find((w) => w.id === workerId);
    if (!worker?.user_id) return toast.error("Worker user ID not found");

    const { error } = await supabase.functions.invoke("admin-invite-user", {
      body: { action: "remove_role", userId: worker.user_id, role: "worker" },
    });

    if (error) {
      toast.error("Failed to delete worker: " + error.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["admin_workers"] });
    queryClient.invalidateQueries({ queryKey: ["workers"] });
    queryClient.invalidateQueries({ queryKey: ["admin_user_roles"] });
    
    toast.success("Worker removed and role revoked");
    if (user?.id) logAdminAction({ adminUserId: user.id, action: "worker.delete", targetType: "worker", targetId: workerId });
  };

  const addFeatured = async (workerId?: string) => {
    const targetWorkerId = workerId || featureWorkerId;
    if (!targetWorkerId) {
      toast.error("Select a worker to feature");
      return;
    }
    const worker = (workers as any[]).find((w) => w.id === targetWorkerId);
    const { error } = await (supabase as any).from("featured_services").insert({
      service_id: targetWorkerId,
      owner_user_id: worker?.user_id || null,
      priority: Number(featurePriority) || 100,
      is_active: true,
      created_by: user?.id || null,
    });
    if (error) {
      toast.error("Failed to add featured worker");
      return;
    }
    toast.success("Worker added to featured listings");
    setFeatureWorkerId("");
    queryClient.invalidateQueries({ queryKey: ["admin_featured_services"] });
  };

  const removeFeatured = async (id: string) => {
    const { error } = await (supabase as any).from("featured_services").delete().eq("id", id);
    if (error) return toast.error("Failed to remove featured listing");
    toast.success("Removed from featured listings");
    queryClient.invalidateQueries({ queryKey: ["admin_featured_services"] });
  };

  const toggleFeaturedActive = async (id: string, active: boolean) => {
    const { error } = await (supabase as any).from("featured_services").update({ is_active: !active }).eq("id", id);
    if (error) return toast.error("Failed to update featured status");
    toast.success(!active ? "Featured listing enabled" : "Featured listing disabled");
    queryClient.invalidateQueries({ queryKey: ["admin_featured_services"] });
  };


  const toggleDonorStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await supabase.from("profiles").update({ donor_status: newStatus }).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin_blood_donors"] });
    toast.success(`Donor ${newStatus === "active" ? "activated" : "deactivated"}`);
  };

  const removeDonor = async (userId: string) => {
    await supabase.from("profiles").update({ is_blood_donor: false, donor_status: "inactive" }).eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["admin_blood_donors"] });
    toast.success("Donor removed from list");
  };

  const onSignOut = async () => {
    await signOut();
    navigate("/");
  };


  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hero">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!isStaff) return null;

  return (
    <SidebarProvider>
      <div className="admin-shell flex min-h-screen w-full bg-hero text-hero-foreground">
        <AdminSidebar tab={tab} setTab={setTab} onSignOut={onSignOut} />

        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-hero-foreground/10 bg-hero/80 px-3 sm:px-4 backdrop-blur-md">
            <SidebarTrigger className="text-hero-foreground hover:bg-hero-foreground/10" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-hero-foreground">
                {NAV_ITEMS.find((n) => n.key === tab)?.label}
              </p>
              <p className="truncate text-[11px] text-hero-foreground/60">Signed in as {user?.email}</p>
            </div>
            <Badge className="bg-primary text-primary-foreground shrink-0">Admin</Badge>
          </header>

          <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
            {/* OVERVIEW */}
            {tab === "overview" && (() => {
              const items = [
                { key: "finance", label: "Payments", count: pending?.payments ?? 0, icon: Zap },
                { key: "verifications", label: "Verifications", count: pending?.verifications ?? 0, icon: BadgeCheck },
                { key: "featured", label: "Featured", count: pending?.featured ?? 0, icon: Star },
                { key: "avatar_resets", label: "Avatar Resets", count: pending?.avatars ?? 0, icon: UserCog },
                { key: "location_requests", label: "Location Req", count: pending?.locations ?? 0, icon: UserCog },
              ];
              const open = items.filter((i) => i.count > 0);
              return (
                <div className="mx-auto max-w-3xl">
                  <SectionHeader title="Overview" subtitle="Only what needs your attention." />

                  <div className="rounded-3xl border border-hero-foreground/10 bg-hero-foreground/[0.04] divide-y divide-hero-foreground/10">
                    {open.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-hero-foreground/60">
                        <CheckCircle className="h-4 w-4 text-success" />
                        All caught up.
                      </div>
                    ) : (
                      open.map((i) => (
                        <button
                          key={i.key}
                          onClick={() => setTab(i.key as TabKey)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-hero-foreground/[0.04]"
                        >
                          <span className="flex items-center gap-3 text-sm font-medium text-hero-foreground">
                            <i.icon className="h-4 w-4 text-primary" />
                            {i.label}
                          </span>
                          <Badge className="bg-primary text-primary-foreground">{i.count}</Badge>
                        </button>
                      ))
                    )}
                  </div>

                  <p className="mt-4 text-center text-[11px] text-hero-foreground/50">
                    {allProfiles.length} users · {workers.length} workers · {newUsers24h} new (24h)
                  </p>
                </div>
              );
            })()}



            {/* WORKERS */}
            {tab === "workers" && (
              <div>
                <SectionHeader title="Workers" subtitle="Verify, feature, and review your providers." />
                <div className="mb-3 relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hero-foreground/40" />
                  <Input
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    placeholder="Search by name, profession or category…"
                    className="pl-9 h-9"
                  />
                </div>
                <div className="space-y-3">
                  {workers
                    .filter((w: any) => {
                      const q = workerSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (w.profiles?.full_name || "").toLowerCase().includes(q) ||
                        (w.profession || "").toLowerCase().includes(q) ||
                        (w.main_category || "").toLowerCase().includes(q) ||
                        (w.sub_category || "").toLowerCase().includes(q)
                      );
                    })
                    .map((w: any) => (
                    <div
                      key={w.id}
                      className="flex flex-col gap-3 rounded-3xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-3.5 sm:p-4 sm:flex-row sm:flex-wrap sm:items-center transition-colors hover:border-hero-foreground/20"
                    >
                      <div className="flex items-start gap-3 sm:flex-1 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 text-sm font-bold text-primary">
                          {w.profiles?.avatar_url ? (
                            <img src={w.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            w.profiles?.full_name?.slice(0, 2).toUpperCase() || "??"
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-hero-foreground">{w.profiles?.full_name}</p>
                          <p className="truncate text-xs text-hero-foreground/60">{w.profession} · {w.experience} yrs</p>
                          <p className="mt-0.5 truncate text-[11px] text-hero-foreground/50">
                            {w.main_category} / {w.sub_category}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {w.verification_requested && !w.verified && (
                              <Badge variant="outline" className="animate-pulse bg-warning/10 text-[10px] text-warning border-warning/30">
                                Verification Req
                              </Badge>
                            )}
                            {w.featured_requested && !featuredMap.has(w.id) && (
                              <Badge variant="outline" className="animate-pulse bg-primary/10 text-[10px] text-primary border-primary/30">
                                Featured Req
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                        <Button
                          variant={w.available ? "outline" : "default"}
                          size="sm"
                          className="h-9 sm:h-8 px-2.5 text-[11px]"
                          onClick={() => toggleAvailable(w.id, w.available)}
                          title={w.available ? "Hide from listings" : "Show in listings"}
                        >
                          {w.available ? <XCircle className="mr-1 h-3 w-3" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                          {w.available ? "Hide" : "Unhide"}
                        </Button>
                        {/* Feature & Verify actions live in the dedicated Featured and Verifications tabs to avoid conflicting workflows. */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 sm:h-8 px-2.5 text-[11px]"
                          onClick={() => setEditingWorker(w)}
                          title="Edit profession & category"
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteWorker(w.id)}
                          className="h-9 w-9 sm:h-8 sm:w-8 col-span-2 sm:col-auto text-destructive hover:bg-destructive/10 hover:text-destructive justify-self-end"
                          title="Delete worker profile"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {workers.length === 0 && (
                    <p className="py-8 text-center text-hero-foreground/60">No workers registered.</p>
                  )}
                </div>
                <EditWorkerDialog
                  worker={editingWorker}
                  open={!!editingWorker}
                  onOpenChange={(o) => { if (!o) setEditingWorker(null); }}
                />
              </div>
            )}

            {/* USERS */}
            {tab === "users" && (
              <Suspense fallback={<TabFallback />}>
                <UsersManagementTab profiles={allProfiles as any} userRoles={allUserRoles as any} />
              </Suspense>
            )}

            {/* SETTINGS (App Defaults + Account) */}
            {tab === "settings" && (
              <Suspense fallback={<TabFallback />}>
                <SettingsTab />
              </Suspense>
            )}

            {/* CATEGORIES */}
            {tab === "categories" && (
              <Suspense fallback={<TabFallback />}>
                <TaxonomyManagementTab categories={categories as any} />
              </Suspense>
            )}

            {/* DONORS */}
            {tab === "donors" && (
              <div>
                <SectionHeader title="Blood Donors" subtitle="Activate or remove donors from the registry." />
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge
                    variant={donorFilter === "" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setDonorFilter("")}
                  >
                    All
                  </Badge>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <Badge
                      key={bg}
                      variant={donorFilter === bg ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setDonorFilter(donorFilter === bg ? "" : bg)}
                    >
                      {bg}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-3">
                  {bloodDonors
                    .filter((d: any) => !donorFilter || d.blood_group === donorFilter)
                    .map((d: any) => (
                      <div key={d.id} className="flex flex-col gap-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="flex flex-1 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-sm font-bold text-destructive">
                            {d.full_name?.slice(0, 2).toUpperCase() || "??"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-hero-foreground">{d.full_name || "Unnamed"}</p>
                            <p className="truncate text-xs text-hero-foreground/60">
                              {d.city || "No city"} · {d.blood_group || "?"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Badge
                            variant="outline"
                            className={d.donor_status === "active" ? "border-success text-success" : ""}
                          >
                            {d.donor_status === "active" ? "Active" : "Inactive"}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => toggleDonorStatus(d.user_id, d.donor_status)}>
                            <Droplet className="mr-1 h-3 w-3" />
                            {d.donor_status === "active" ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => removeDonor(d.user_id)}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {bloodDonors.filter((d: any) => !donorFilter || d.blood_group === donorFilter).length === 0 && (
                    <p className="py-8 text-center text-hero-foreground/60">No blood donors found.</p>
                  )}
                </div>
              </div>
            )}

            {/* FEATURED */}
            {tab === "featured" && (
              <div>
                <SectionHeader title="Featured Workers" subtitle="Sparks-based featured listings, pricing rules, and active promotions." />
                <Suspense fallback={<TabFallback />}>
                  <FeaturedManagementTab />
                </Suspense>
              </div>
            )}

            {/* VERIFICATIONS */}
            {tab === "verifications" && (
              <div>
                <SectionHeader title="Verified Badge System" subtitle="Review submissions, configure sparks cost and Persona auto-approval." />
                <Suspense fallback={<TabFallback />}>
                  <VerificationsAdminPanel />
                </Suspense>
              </div>
            )}


            {/* RUNNING ADS (campaigns: view + control) */}
            {tab === "running_ads" && (
              <Suspense fallback={<TabFallback />}>
                <RunningAdsPanel />
              </Suspense>
            )}

            {/* SPARKS & CAMPAIGNS */}
            {tab === "sparks" && (
              <Suspense fallback={<TabFallback />}>
                <SparksAdminTab />
              </Suspense>
            )}

            {tab === "finance" && (
              <Suspense fallback={<TabFallback />}>
                <FinanceTab />
              </Suspense>
            )}

            {tab === "discounts" && (
              <Suspense fallback={<TabFallback />}>
                <DiscountsTab />
              </Suspense>
            )}

            {tab === "tiers" && (
              <Suspense fallback={<TabFallback />}>
                <TierPricingTab />
              </Suspense>
            )}





            {/* AVATAR RESETS */}
            {tab === "avatar_resets" && <AvatarResetsTab />}

            {tab === "location_requests" && <LocationChangeRequestsTab />}

            {/* PUSH BROADCAST */}
            {tab === "push" && (
              <Suspense fallback={<TabFallback />}>
                <PushBroadcastTab />
              </Suspense>
            )}

            {/* AUDIT & ACCESS */}
            {tab === "audit" && (
              <Suspense fallback={<TabFallback />}>
                <AuditLogTab />
              </Suspense>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
