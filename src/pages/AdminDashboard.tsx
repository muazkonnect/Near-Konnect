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
  Plus,
  Heart,
  Droplet,
  Megaphone,
  Star,
  LayoutDashboard,
  MapPin,
  LogOut,
  Crown,
  UserCog,
  Home,
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
import NativeAdCard from "@/components/NativeAdCard";
import type { NativeAd } from "@/hooks/useSponsored";
import MapLocationPicker from "@/components/MapLocationPicker";
import { calculateDistance, type Coords } from "@/lib/geolocation";
import UsersManagementTab from "@/components/admin/UsersManagementTab";
import AdminProfileTab from "@/components/admin/AdminProfileTab";
import CategoriesManagementTab from "@/components/admin/CategoriesManagementTab";
import AdsManagementTab from "@/components/admin/AdsManagementTab";
import FeaturedManagementTab from "@/components/admin/FeaturedManagementTab";
import EditWorkerDialog from "@/components/admin/EditWorkerDialog";
import { Pencil } from "lucide-react";
import { logAdminAction } from "@/lib/adminAudit";

type TabKey = "overview" | "workers" | "users" | "categories" | "donors" | "featured" | "ads" | "profile";

const NAV_ITEMS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "workers", label: "Workers", icon: Briefcase },
  { key: "users", label: "Users", icon: Users },
  { key: "categories", label: "Categories", icon: Shield },
  { key: "donors", label: "Blood Donors", icon: Heart },
  { key: "featured", label: "Featured", icon: Star },
  { key: "ads", label: "Ads & Geo", icon: Megaphone },
  { key: "profile", label: "My Profile", icon: UserCog },
];

const AdminSidebar = ({ tab, setTab, onSignOut }: { tab: TabKey; setTab: (t: TabKey) => void; onSignOut: () => void }) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Crown className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight text-sidebar-foreground">Admin</p>
              <p className="truncate text-[11px] text-muted-foreground">Control center</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((it) => {
                const active = tab === it.key;
                const Icon = it.icon;
                return (
                  <SidebarMenuItem key={it.key}>
                    <SidebarMenuButton
                      onClick={() => setTab(it.key)}
                      className={
                        active
                          ? "bg-primary/15 font-semibold text-foreground hover:bg-primary/20"
                          : "hover:bg-muted"
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>{it.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-muted-foreground hover:bg-muted">
              <Link to="/">
                <Home className="h-4 w-4" />
                <span>Back to Home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSignOut} className="text-muted-foreground hover:bg-muted">
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

const StatCard = ({ label, value, icon: Icon, accent }: { label: string; value: number; icon: typeof Users; accent?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative overflow-hidden rounded-2xl border p-4 ${accent ? "bg-hero text-hero-foreground" : "bg-card"}`}
  >
    <div className="flex items-center justify-between">
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-hero-foreground/70" : "text-muted-foreground"}`}>
        {label}
      </p>
      <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
    </div>
    <p className={`mt-2 text-2xl font-bold ${accent ? "text-hero-foreground" : "text-card-foreground"}`}>{value}</p>
  </motion.div>
);

const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
    <div>
      <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
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
  const [adTitle, setAdTitle] = useState("");
  const [adDescription, setAdDescription] = useState("");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adLink, setAdLink] = useState("");
  const [adCtaLabel, setAdCtaLabel] = useState("Learn More");
  const [adPlacement, setAdPlacement] = useState<"home_banner" | "home_feed">("home_banner");
  const [adPriority, setAdPriority] = useState("100");
  const [adTargetCoords, setAdTargetCoordsState] = useState<Coords | null>(null);
  const [adRadiusKm, setAdRadiusKm] = useState("3");
  const [donorFilter, setDonorFilter] = useState("");
  const [viewerCoords, setViewerCoords] = useState<Coords | null>(null);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [editingWorker, setEditingWorker] = useState<any | null>(null);

  const setAdTargetCoords = (c: Coords | null) => {
    setAdTargetCoordsState(c);
    if (c && !adRadiusKm.trim()) setAdRadiusKm("3");
  };

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
      .channel("admin-realtime")
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

  const addAd = async () => {
    if (!adTitle.trim() || !adLink.trim()) {
      toast.error("Ad title and link are required");
      return;
    }
    const radius = adRadiusKm.trim() ? Number(adRadiusKm) : null;
    if (adTargetCoords && (!radius || radius <= 0)) {
      toast.error("Set a radius (km) for geo-targeted ads");
      return;
    }
    const { error } = await (supabase as any).from("native_ads").insert({
      title: adTitle.trim(),
      description: adDescription.trim() || null,
      image_url: adImageUrl.trim() || null,
      cta_url: adLink.trim(),
      cta_label: adCtaLabel.trim() || "Learn More",
      placement: adPlacement,
      ad_type: adPlacement === "home_banner" ? "banner" : "in_feed",
      is_active: true,
      priority: Number(adPriority) || 100,
      target_latitude: adTargetCoords?.latitude ?? null,
      target_longitude: adTargetCoords?.longitude ?? null,
      target_radius_km: adTargetCoords ? radius : null,
      created_by: user?.id || null,
    });
    if (error) return toast.error("Failed to create ad");
    toast.success(adTargetCoords ? "Geo-targeted ad created" : "Global ad created");
    resetAdForm();
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
  };

  const updateAd = async () => {
    if (!editingAdId) return;
    if (!adTitle.trim() || !adLink.trim()) {
      toast.error("Ad title and link are required");
      return;
    }
    const radius = adRadiusKm.trim() ? Number(adRadiusKm) : null;
    if (adTargetCoords && (!radius || radius <= 0)) {
      toast.error("Set a radius (km) for geo-targeted ads");
      return;
    }
    const { error } = await (supabase as any)
      .from("native_ads")
      .update({
        title: adTitle.trim(),
        description: adDescription.trim() || null,
        image_url: adImageUrl.trim() || null,
        cta_url: adLink.trim(),
        cta_label: adCtaLabel.trim() || "Learn More",
        placement: adPlacement,
        ad_type: adPlacement === "home_banner" ? "banner" : "in_feed",
        priority: Number(adPriority) || 100,
        target_latitude: adTargetCoords?.latitude ?? null,
        target_longitude: adTargetCoords?.longitude ?? null,
        target_radius_km: adTargetCoords ? radius : null,
      })
      .eq("id", editingAdId);

    if (error) return toast.error("Failed to update ad");
    toast.success("Ad updated successfully");
    resetAdForm();
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
  };

  const resetAdForm = () => {
    setAdTitle("");
    setAdDescription("");
    setAdImageUrl("");
    setAdLink("");
    setAdCtaLabel("Learn More");
    setAdPriority("100");
    setAdTargetCoordsState(null);
    setAdRadiusKm("3");
    setEditingAdId(null);
  };

  const startEditingAd = (ad: any) => {
    setEditingAdId(ad.id);
    setAdTitle(ad.title || "");
    setAdDescription(ad.description || "");
    setAdImageUrl(ad.image_url || "");
    setAdLink(ad.cta_url || "");
    setAdCtaLabel(ad.cta_label || "Learn More");
    setAdPlacement(ad.placement);
    setAdPriority(String(ad.priority || "100"));
    if (ad.target_latitude && ad.target_longitude) {
      setAdTargetCoordsState({ latitude: ad.target_latitude, longitude: ad.target_longitude });
      setAdRadiusKm(String(ad.target_radius_km || "3"));
    } else {
      setAdTargetCoordsState(null);
      setAdRadiusKm("3");
    }
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleAdActive = async (id: string, active: boolean) => {
    const { error } = await (supabase as any).from("native_ads").update({ is_active: !active }).eq("id", id);
    if (error) return toast.error("Failed to update ad status");
    toast.success(!active ? "Ad enabled" : "Ad disabled");
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
  };

  const deleteAd = async (id: string) => {
    const { error } = await (supabase as any).from("native_ads").delete().eq("id", id);
    if (error) return toast.error("Failed to delete ad");
    toast.success("Ad deleted");
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
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

  // ===== Computed: distance for active ads given the test viewer location =====
  const adsWithDistance = useMemo(() => {
    return (nativeAds as any[]).map((ad) => {
      const hasTarget =
        ad.target_latitude != null && ad.target_longitude != null && (ad.target_radius_km ?? 0) > 0;
      let distanceKm: number | null = null;
      let inRadius: boolean | null = null;
      if (hasTarget && viewerCoords) {
        distanceKm = calculateDistance(
          viewerCoords.latitude,
          viewerCoords.longitude,
          ad.target_latitude,
          ad.target_longitude
        );
        inRadius = distanceKm <= ad.target_radius_km;
      } else if (!hasTarget) {
        inRadius = true; // global
      }
      return { ad, hasTarget, distanceKm, inRadius };
    });
  }, [nativeAds, viewerCoords]);

  // Distance for the draft ad being composed
  const draftDistance = useMemo(() => {
    if (!adTargetCoords || !viewerCoords) return null;
    return calculateDistance(
      viewerCoords.latitude,
      viewerCoords.longitude,
      adTargetCoords.latitude,
      adTargetCoords.longitude
    );
  }, [adTargetCoords, viewerCoords]);
  const draftRadiusNum = Number(adRadiusKm) || 0;
  const draftInRadius = draftDistance != null && draftRadiusNum > 0 ? draftDistance <= draftRadiusNum : null;

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!isStaff) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar tab={tab} setTab={setTab} onSignOut={onSignOut} />

        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
            <SidebarTrigger />
            <div className="flex-1">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {NAV_ITEMS.find((n) => n.key === tab)?.label}
              </p>
              <p className="text-[11px] text-muted-foreground">Signed in as {user?.email}</p>
            </div>
            <Badge className="bg-primary text-primary-foreground">Admin</Badge>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {/* OVERVIEW */}
            {tab === "overview" && (
              <div>
                <SectionHeader title="Overview" subtitle="A quick pulse on your platform." />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  <StatCard label="Users" value={allProfiles.length} icon={Users} accent />
                  <StatCard label="Workers" value={workers.length} icon={Briefcase} />
                  <StatCard label="Categories" value={categories.length} icon={Shield} />
                  <StatCard label="Donors" value={bloodDonors.length} icon={Heart} />
                  <StatCard label="Featured" value={featuredServices.length} icon={Star} />
                  <StatCard label="Ads" value={nativeAds.length} icon={Megaphone} />
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border bg-card p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Latest workers</h3>
                    <ul className="mt-3 space-y-2">
                      {workers.slice(0, 5).map((w: any) => (
                        <li key={w.id} className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-medium text-card-foreground">
                            {w.profiles?.full_name || "Unnamed"}
                          </span>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-muted-foreground/70">{w.profession}</span>
                            <span className="text-[10px] text-muted-foreground/60">{w.main_category} · {w.sub_category}</span>
                          </div>
                        </li>
                      ))}
                      {workers.length === 0 && <li className="text-sm text-muted-foreground">No workers yet.</li>}
                    </ul>
                  </div>
                  <div className="rounded-2xl border bg-card p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Latest ads</h3>
                    <ul className="mt-3 space-y-2">
                      {(nativeAds as any[]).slice(0, 5).map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-medium text-card-foreground">{a.title}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {a.placement}
                          </Badge>
                        </li>
                      ))}
                      {nativeAds.length === 0 && <li className="text-sm text-muted-foreground">No ads yet.</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* WORKERS */}
            {tab === "workers" && (
              <div>
                <SectionHeader title="Workers" subtitle="Verify, feature, and review your providers." />
                <div className="space-y-3">
                  {workers.map((w: any) => (
                    <div
                      key={w.id}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">
                        {w.profiles?.full_name?.slice(0, 2).toUpperCase() || "??"}
                      </div>
                      <div className="min-w-[180px] flex-1">
                        <p className="font-semibold text-card-foreground">{w.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground/70">{w.profession} · {w.experience} yrs</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                          {w.main_category} / {w.sub_category}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
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
                          <Button
                            variant={w.available ? "outline" : "default"}
                            size="sm"
                            className="h-8 px-2 text-[11px]"
                            onClick={() => toggleAvailable(w.id, w.available)}
                            title={w.available ? "Hide from listings" : "Show in listings"}
                          >
                            {w.available ? <XCircle className="mr-1 h-3 w-3" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                            {w.available ? "Hide" : "Unhide"}
                          </Button>
                          <Button
                            variant={featuredMap.has(w.id) ? "secondary" : (w.featured_requested ? "default" : "outline")}
                            size="sm"
                            className="h-8 px-2 text-[11px]"
                            onClick={async () => {
                              const featured = featuredMap.get(w.id);
                              if (featured) {
                                await removeFeatured(featured.id);
                              } else {
                                await addFeatured(w.id);
                                if (w.featured_requested) {
                                  await supabase.from("workers").update({ featured_requested: false, is_featured: true }).eq("id", w.id);
                                }
                              }
                            }}
                          >
                            <Star className={`mr-1 h-3 w-3 ${featuredMap.has(w.id) ? "fill-current" : ""}`} />
                            {featuredMap.has(w.id) ? "Unfeature" : "Feature"}
                          </Button>
                          <Button
                            variant={w.verified ? "outline" : (w.verification_requested ? "default" : "outline")}
                            size="sm"
                            className="h-8 px-2 text-[11px]"
                            onClick={async () => {
                              const newStatus = !w.verified;
                              await toggleVerified(w.id, w.verified);
                              if (newStatus && w.verification_requested) {
                                await supabase.from("workers").update({ verification_requested: false }).eq("id", w.id);
                              }
                            }}
                          >
                            {w.verified ? <XCircle className="mr-1 h-3 w-3" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                            {w.verified ? "Unverify" : "Verify"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-[11px]"
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
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Delete worker profile"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {workers.length === 0 && (
                    <p className="py-8 text-center text-muted-foreground">No workers registered.</p>
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
              <UsersManagementTab profiles={allProfiles as any} userRoles={allUserRoles as any} />
            )}

            {/* PROFILE */}
            {tab === "profile" && <AdminProfileTab />}

            {/* CATEGORIES */}
            {tab === "categories" && (
              <CategoriesManagementTab categories={categories as any} />
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
                      <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-sm font-bold text-destructive">
                          {d.full_name?.slice(0, 2).toUpperCase() || "??"}
                        </div>
                        <div className="min-w-[160px] flex-1">
                          <p className="font-semibold text-card-foreground">{d.full_name || "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.city || "No city"} · {d.blood_group || "?"}
                          </p>
                        </div>
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
                    ))}
                  {bloodDonors.filter((d: any) => !donorFilter || d.blood_group === donorFilter).length === 0 && (
                    <p className="py-8 text-center text-muted-foreground">No blood donors found.</p>
                  )}
                </div>
              </div>
            )}

            {/* FEATURED */}
            {tab === "featured" && (
              <div>
                <SectionHeader title="Featured Workers" subtitle="Promote, schedule, and review featured listings." />
                <FeaturedManagementTab />
              </div>
            )}

            {/* ADS */}
            {tab === "ads" && <AdsManagementTab />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
