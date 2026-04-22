import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

type TabKey = "overview" | "workers" | "users" | "categories" | "donors" | "featured" | "ads";

const NAV_ITEMS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "workers", label: "Workers", icon: Briefcase },
  { key: "users", label: "Users", icon: Users },
  { key: "categories", label: "Categories", icon: Shield },
  { key: "donors", label: "Blood Donors", icon: Heart },
  { key: "featured", label: "Featured", icon: Star },
  { key: "ads", label: "Ads & Geo", icon: Megaphone },
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
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSignOut} className="text-muted-foreground hover:bg-muted">
              <LogOut className="h-4 w-4" />
              <span>Exit admin</span>
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
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
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
    enabled: role === "admin",
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["admin_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: role === "admin",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: role === "admin",
  });

  const { data: bloodDonors = [] } = useQuery({
    queryKey: ["admin_blood_donors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("is_blood_donor", true).order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: role === "admin",
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
    enabled: role === "admin",
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
    enabled: role === "admin",
  });

  const featuredMap = useMemo(
    () => new Map((featuredServices as any[]).map((row) => [row.service_id, row])),
    [featuredServices]
  );

  // ===== Mutations =====
  const toggleVerified = async (workerId: string, current: boolean) => {
    await supabase.from("workers").update({ verified: !current }).eq("id", workerId);
    queryClient.invalidateQueries({ queryKey: ["admin_workers"] });
    toast.success(`Worker ${!current ? "verified" : "unverified"}`);
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
    setAdTitle("");
    setAdDescription("");
    setAdImageUrl("");
    setAdLink("");
    setAdCtaLabel("Learn More");
    setAdPriority("100");
    setAdTargetCoordsState(null);
    setAdRadiusKm("3");
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
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

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await supabase.from("service_categories").insert({
      name: newCatName.trim(),
      icon: newCatIcon || "🔧",
    });
    if (error) return toast.error("Failed to add category");
    toast.success("Category added!");
    setNewCatName("");
    setNewCatIcon("");
    queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("service_categories").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
    toast.success("Category deleted");
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
  if (role !== "admin") return null;

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
                          <span className="text-xs text-muted-foreground">{w.profession}</span>
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
                        <p className="text-xs text-muted-foreground">{w.profession} · {w.experience} yrs</p>
                      </div>
                      <Badge
                        variant={w.available ? "default" : "secondary"}
                        className={w.available ? "bg-success text-success-foreground" : ""}
                      >
                        {w.available ? "Available" : "Offline"}
                      </Badge>
                      <Button
                        variant={featuredMap.has(w.id) ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => {
                          const featured = featuredMap.get(w.id);
                          if (featured) removeFeatured(featured.id);
                          else addFeatured(w.id);
                        }}
                      >
                        <Star className="mr-1 h-3 w-3" />
                        {featuredMap.has(w.id) ? "Unfeature" : "Feature"}
                      </Button>
                      <Button
                        variant={w.verified ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleVerified(w.id, w.verified)}
                      >
                        {w.verified ? <XCircle className="mr-1 h-3 w-3" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                        {w.verified ? "Unverify" : "Verify"}
                      </Button>
                    </div>
                  ))}
                  {workers.length === 0 && (
                    <p className="py-8 text-center text-muted-foreground">No workers registered.</p>
                  )}
                </div>
              </div>
            )}

            {/* USERS */}
            {tab === "users" && (
              <div>
                <SectionHeader title="Users" subtitle="Everyone who signed up." />
                <div className="space-y-3">
                  {allProfiles.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">
                        {p.full_name?.slice(0, 2).toUpperCase() || "??"}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-card-foreground">{p.full_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{p.phone || "No phone"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CATEGORIES */}
            {tab === "categories" && (
              <div>
                <SectionHeader title="Categories" subtitle="Service taxonomy used across the app." />
                <div className="mb-4 flex flex-wrap gap-2">
                  <Input
                    placeholder="Category name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="max-w-xs"
                  />
                  <Input
                    placeholder="Icon emoji"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-24"
                  />
                  <Button onClick={addCategory} className="gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {categories.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-4 rounded-2xl border bg-card p-3">
                      <span className="text-xl">{c.icon}</span>
                      <span className="flex-1 font-medium text-card-foreground">{c.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCategory(c.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
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
                <SectionHeader title="Featured Workers" subtitle="Promote workers to the top of the feed." />
                <div className="rounded-2xl border bg-card p-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <select
                      value={featureWorkerId}
                      onChange={(e) => setFeatureWorkerId(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Select worker</option>
                      {(workers as any[]).map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.profiles?.full_name || "Unnamed"} — {w.profession}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Priority (100)"
                      value={featurePriority}
                      onChange={(e) => setFeaturePriority(e.target.value)}
                    />
                    <Button onClick={() => addFeatured()} className="gap-1 md:col-span-2">
                      <Plus className="h-4 w-4" /> Add to Featured
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {(featuredServices as any[]).map((f) => {
                    const linkedWorker = (workers as any[]).find((w) => w.id === f.service_id);
                    return (
                      <div key={f.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-card-foreground">
                            {linkedWorker?.profiles?.full_name || linkedWorker?.profession || "Service"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Priority: {f.priority} · {f.is_active ? "Active" : "Disabled"}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => toggleFeaturedActive(f.id, f.is_active)}>
                          {f.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeFeatured(f.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  {featuredServices.length === 0 && (
                    <p className="py-8 text-center text-muted-foreground">No featured workers yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* ADS */}
            {tab === "ads" && (
              <div className="space-y-6">
                <SectionHeader
                  title="Ads & Geo-targeting"
                  subtitle="Create native ads and target them to a 3 km (or custom) radius."
                />

                {/* Create ad */}
                <div className="rounded-2xl border bg-card p-5">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Create Ad
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input placeholder="Ad title" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} />
                    <Input placeholder="CTA link" value={adLink} onChange={(e) => setAdLink(e.target.value)} />
                    <Input placeholder="Image URL" value={adImageUrl} onChange={(e) => setAdImageUrl(e.target.value)} />
                    <Input placeholder="CTA label" value={adCtaLabel} onChange={(e) => setAdCtaLabel(e.target.value)} />
                    <Input
                      placeholder="Description"
                      value={adDescription}
                      onChange={(e) => setAdDescription(e.target.value)}
                      className="md:col-span-2"
                    />
                    <div className="flex gap-2">
                      <select
                        value={adPlacement}
                        onChange={(e) => setAdPlacement(e.target.value as "home_banner" | "home_feed")}
                        className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="home_banner">Banner</option>
                        <option value="home_feed">Feed</option>
                      </select>
                      <Input
                        placeholder="Priority"
                        value={adPriority}
                        onChange={(e) => setAdPriority(e.target.value)}
                        className="w-28"
                      />
                    </div>
                    <Button onClick={addAd} className="gap-1">
                      <Plus className="h-4 w-4" /> Add Ad
                    </Button>
                  </div>

                  {/* Geo-targeting */}
                  <div className="mt-5 rounded-xl border bg-muted/30 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold text-card-foreground">Geo-targeting</p>
                          <p className="text-xs text-muted-foreground">
                            Pin a center on the map. Default radius 3 km. Leave empty to show globally.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Radius (km)"
                          type="number"
                          min="1"
                          value={adRadiusKm}
                          onChange={(e) => setAdRadiusKm(e.target.value)}
                          className="w-32"
                        />
                        {adTargetCoords && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdTargetCoordsState(null);
                              setAdRadiusKm("3");
                            }}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-lg border" style={{ height: 280 }}>
                      <MapLocationPicker value={adTargetCoords} onChange={setAdTargetCoords} />
                    </div>
                    {adTargetCoords && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Target: {adTargetCoords.latitude.toFixed(4)}, {adTargetCoords.longitude.toFixed(4)}
                        {adRadiusKm ? ` · within ${adRadiusKm} km` : " · set a radius"}
                      </p>
                    )}
                  </div>
                </div>

                {/* TEST VIEWER LOCATION */}
                <div className="rounded-2xl border bg-card p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Test viewer location
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Pretend to be a user at this point on the map. The previews below will show distance + whether each ad is in or out of its radius.
                      </p>
                    </div>
                    {viewerCoords && (
                      <Button variant="ghost" size="sm" onClick={() => setViewerCoords(null)}>
                        Clear viewer
                      </Button>
                    )}
                  </div>
                  <div className="overflow-hidden rounded-lg border" style={{ height: 240 }}>
                    <MapLocationPicker value={viewerCoords} onChange={setViewerCoords} />
                  </div>
                  {viewerCoords && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Viewer at {viewerCoords.latitude.toFixed(4)}, {viewerCoords.longitude.toFixed(4)}
                    </p>
                  )}
                </div>

                {/* DRAFT preview */}
                <div className="rounded-2xl border bg-muted/20 p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Live preview (draft)
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {adPlacement === "home_banner" ? "Banner" : "Feed"}
                      </Badge>
                      {adTargetCoords && draftDistance != null && (
                        <Badge
                          className={
                            draftInRadius
                              ? "bg-success text-success-foreground"
                              : "bg-destructive text-destructive-foreground"
                          }
                        >
                          {draftDistance.toFixed(2)} km · {draftInRadius ? "IN radius" : "OUT of radius"}
                        </Badge>
                      )}
                      {adTargetCoords && !viewerCoords && (
                        <Badge variant="outline" className="text-[10px]">Set viewer to test</Badge>
                      )}
                      {!adTargetCoords && (
                        <Badge variant="outline" className="text-[10px]">🌍 Global</Badge>
                      )}
                    </div>
                  </div>
                  {adTitle.trim() && adLink.trim() ? (
                    <div className={adPlacement === "home_banner" ? "max-w-3xl" : "max-w-md"}>
                      <NativeAdCard
                        variant={adPlacement === "home_banner" ? "banner" : "feed"}
                        ad={{
                          id: "preview",
                          title: adTitle.trim(),
                          description: adDescription.trim() || null,
                          image_url: adImageUrl.trim() || null,
                          cta_url: adLink.trim() || "#",
                          cta_label: adCtaLabel.trim() || "Learn More",
                          placement: adPlacement,
                          ad_type: "in_feed",
                          priority: Number(adPriority) || 100,
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Fill in title and CTA link above to preview.</p>
                  )}
                </div>

                {/* Per-placement preview */}
                {(["home_banner", "home_feed"] as const).map((placement) => {
                  const itemsForPlacement = adsWithDistance
                    .filter(({ ad }) => ad.is_active && ad.placement === placement)
                    .sort((a, b) => (b.ad.priority || 0) - (a.ad.priority || 0))
                    .slice(0, 6);
                  return (
                    <div key={placement} className="rounded-2xl border bg-card p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                          Active — {placement === "home_banner" ? "Home Banner" : "Home Feed"}
                        </h3>
                        <Badge variant="outline" className="text-[10px]">
                          {itemsForPlacement.length} live
                        </Badge>
                      </div>
                      {itemsForPlacement.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active ads in this placement.</p>
                      ) : (
                        <div className={placement === "home_banner" ? "space-y-4" : "grid gap-4 md:grid-cols-2"}>
                          {itemsForPlacement.map(({ ad, hasTarget, distanceKm, inRadius }) => (
                            <div key={ad.id} className="space-y-2">
                              <NativeAdCard
                                ad={ad as NativeAd}
                                variant={placement === "home_banner" ? "banner" : "feed"}
                              />
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                {!hasTarget && (
                                  <Badge variant="outline" className="text-[10px]">🌍 Global</Badge>
                                )}
                                {hasTarget && (
                                  <Badge variant="outline" className="text-[10px]">
                                    📍 radius {ad.target_radius_km} km
                                  </Badge>
                                )}
                                {hasTarget && viewerCoords && distanceKm != null && (
                                  <Badge
                                    className={
                                      inRadius
                                        ? "bg-success text-success-foreground"
                                        : "bg-destructive text-destructive-foreground"
                                    }
                                  >
                                    {distanceKm.toFixed(2)} km · {inRadius ? "IN" : "OUT"}
                                  </Badge>
                                )}
                                {hasTarget && !viewerCoords && (
                                  <span className="text-muted-foreground">
                                    Set a viewer location to see distance
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Full ad list */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    All ads
                  </h3>
                  {adsWithDistance.map(({ ad, hasTarget, distanceKm, inRadius }) => (
                    <div key={ad.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3">
                      <div className="h-12 w-16 overflow-hidden rounded-lg border bg-muted">
                        {ad.image_url ? (
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-[200px] flex-1">
                        <p className="truncate font-semibold text-card-foreground">{ad.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ad.placement} · Priority {ad.priority} · {ad.is_active ? "Active" : "Disabled"}
                          {hasTarget
                            ? ` · 📍 ${ad.target_latitude.toFixed(3)}, ${ad.target_longitude.toFixed(3)} (${ad.target_radius_km} km)`
                            : " · 🌍 Global"}
                        </p>
                      </div>
                      {hasTarget && viewerCoords && distanceKm != null && (
                        <Badge
                          className={
                            inRadius
                              ? "bg-success text-success-foreground"
                              : "bg-destructive text-destructive-foreground"
                          }
                        >
                          {distanceKm.toFixed(2)} km · {inRadius ? "IN" : "OUT"}
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" onClick={() => toggleAdActive(ad.id, ad.is_active)}>
                        {ad.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteAd(ad.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {nativeAds.length === 0 && (
                    <p className="py-8 text-center text-muted-foreground">No ads yet.</p>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
