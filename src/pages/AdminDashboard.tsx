import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Briefcase, Shield, Trash2, CheckCircle, XCircle, Plus, Heart, Droplet, Megaphone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"workers" | "users" | "categories" | "donors" | "featured" | "ads">("workers");
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

  useEffect(() => {
    if (!authLoading && !roleLoading && role !== "admin") {
      toast.error("Access denied. Admin only.");
      navigate("/");
    }
  }, [authLoading, roleLoading, role, navigate]);

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
        .select("id, title, image_url, cta_url, cta_label, placement, ad_type, priority, is_active, created_at")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: role === "admin",
  });
  const [donorFilter, setDonorFilter] = useState("");

  const featuredMap = new Map((featuredServices as any[]).map((row) => [row.service_id, row]));

  const toggleVerified = async (workerId: string, current: boolean) => {
    await supabase.from("workers").update({ verified: !current }).eq("id", workerId);
    queryClient.invalidateQueries({ queryKey: ["admin_workers"] });
    toast.success(current ? "Worker unverified" : "Worker verified!");
  };

  const addFeatured = async (workerId?: string) => {
    const targetWorkerId = workerId || featureWorkerId;
    if (!targetWorkerId) return;
    const worker = (workers as any[]).find((w) => w.id === targetWorkerId);

    const { error } = await (supabase as any).from("featured_services").insert({
      service_id: targetWorkerId,
      owner_user_id: worker?.user_id || null,
      priority: Number(featurePriority) || 100,
      is_active: true,
    });

    if (error) {
      toast.error("Failed to feature worker");
      return;
    }

    toast.success("Worker added to featured listings");
    setFeatureWorkerId("");
    queryClient.invalidateQueries({ queryKey: ["admin_featured_services"] });
  };

  const removeFeatured = async (id: string) => {
    const { error } = await (supabase as any).from("featured_services").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove featured listing");
      return;
    }
    toast.success("Removed from featured listings");
    queryClient.invalidateQueries({ queryKey: ["admin_featured_services"] });
  };

  const toggleFeaturedActive = async (id: string, active: boolean) => {
    const { error } = await (supabase as any).from("featured_services").update({ is_active: !active }).eq("id", id);
    if (error) {
      toast.error("Failed to update featured status");
      return;
    }
    toast.success(!active ? "Featured listing enabled" : "Featured listing disabled");
    queryClient.invalidateQueries({ queryKey: ["admin_featured_services"] });
  };

  const addAd = async () => {
    if (!adTitle.trim() || !adLink.trim()) {
      toast.error("Ad title and link are required");
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
      created_by: user?.id || null,
    });

    if (error) {
      toast.error("Failed to create ad");
      return;
    }

    toast.success("Ad created successfully");
    setAdTitle("");
    setAdDescription("");
    setAdImageUrl("");
    setAdLink("");
    setAdCtaLabel("Learn More");
    setAdPriority("100");
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
  };

  const toggleAdActive = async (id: string, active: boolean) => {
    const { error } = await (supabase as any).from("native_ads").update({ is_active: !active }).eq("id", id);
    if (error) {
      toast.error("Failed to update ad status");
      return;
    }
    toast.success(!active ? "Ad enabled" : "Ad disabled");
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
  };

  const deleteAd = async (id: string) => {
    const { error } = await (supabase as any).from("native_ads").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete ad");
      return;
    }
    toast.success("Ad deleted");
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await supabase.from("service_categories").insert({
      name: newCatName.trim(),
      icon: newCatIcon || "🔧",
    });
    if (error) toast.error("Failed to add category");
    else {
      toast.success("Category added!");
      setNewCatName("");
      setNewCatIcon("");
      queryClient.invalidateQueries({ queryKey: ["admin_categories"] });
    }
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

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground mb-8">Manage platform users, workers, and categories</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Users", value: allProfiles.length, icon: Users },
            { label: "Workers", value: workers.length, icon: Briefcase },
            { label: "Categories", value: categories.length, icon: Shield },
            { label: "Blood Donors", value: bloodDonors.length, icon: Heart },
            { label: "Featured", value: featuredServices.length, icon: Star },
            { label: "Ads", value: nativeAds.length, icon: Megaphone },
          ].map(s => (
            <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border rounded-xl p-4 text-center">
              <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-card-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg w-fit flex-wrap">
          {(["workers", "users", "categories", "donors", "featured", "ads"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                tab === t ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Workers Tab */}
        {tab === "workers" && (
          <div className="space-y-3">
            {workers.map((w: any) => (
              <div key={w.id} className="flex items-center gap-4 p-4 bg-card border rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground">
                  {w.profiles?.full_name?.slice(0, 2).toUpperCase() || "??"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-card-foreground">{w.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{w.profession} · {w.experience} yrs exp</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={w.available ? "default" : "secondary"} className={w.available ? "bg-success text-success-foreground" : ""}>
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
                    {featuredMap.has(w.id) ? "Unfeature" : "Feature"}
                  </Button>
                  <Button
                    variant={w.verified ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleVerified(w.id, w.verified)}
                    className="gap-1"
                  >
                    {w.verified ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    {w.verified ? "Unverify" : "Verify"}
                  </Button>
                </div>
              </div>
            ))}
            {workers.length === 0 && <p className="text-muted-foreground text-center py-8">No workers registered.</p>}
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div className="space-y-3">
            {allProfiles.map((p: any) => (
              <div key={p.id} className="flex items-center gap-4 p-4 bg-card border rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground">
                  {p.full_name?.slice(0, 2).toUpperCase() || "??"}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-card-foreground">{p.full_name || "Unnamed"}</p>
                  <p className="text-sm text-muted-foreground">{p.phone || "No phone"} · {p.city || "No city"}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Categories Tab */}
        {tab === "categories" && (
          <div>
            <div className="flex gap-2 mb-4">
              <Input placeholder="Category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="max-w-xs" />
              <Input placeholder="Icon emoji" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} className="w-20" />
              <Button onClick={addCategory} className="gap-1"><Plus className="w-4 h-4" /> Add</Button>
            </div>
            <div className="space-y-2">
              {categories.map((c: any) => (
                <div key={c.id} className="flex items-center gap-4 p-3 bg-card border rounded-xl">
                  <span className="text-xl">{c.icon}</span>
                  <span className="flex-1 font-medium text-card-foreground">{c.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => deleteCategory(c.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Donors Tab */}
        {tab === "donors" && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Badge
                variant={donorFilter === "" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setDonorFilter("")}
              >All</Badge>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                <Badge
                  key={bg}
                  variant={donorFilter === bg ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setDonorFilter(donorFilter === bg ? "" : bg)}
                >{bg}</Badge>
              ))}
            </div>
            <div className="space-y-3">
              {bloodDonors
                .filter((d: any) => !donorFilter || d.blood_group === donorFilter)
                .map((d: any) => (
                <div key={d.id} className="flex items-center gap-4 p-4 bg-card border rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-sm font-bold text-red-600">
                    {d.full_name?.slice(0, 2).toUpperCase() || "??"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-card-foreground">{d.full_name || "Unnamed"}</p>
                    <p className="text-sm text-muted-foreground">{d.city || "No city"} · {d.blood_group || "?"}</p>
                  </div>
                  <Badge variant="outline" className={d.donor_status === "active" ? "border-green-300 text-green-600" : ""}>
                    {d.donor_status === "active" ? "Active" : "Inactive"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleDonorStatus(d.user_id, d.donor_status)}>
                    <Droplet className="w-3 h-3 mr-1" />
                    {d.donor_status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeDonor(d.user_id)}>
                    <XCircle className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {bloodDonors.filter((d: any) => !donorFilter || d.blood_group === donorFilter).length === 0 && (
                <p className="text-muted-foreground text-center py-8">No blood donors found.</p>
              )}
            </div>
          </div>
        )}

        {tab === "featured" && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-card-foreground mb-3">Add Featured Worker</h3>
              <div className="grid gap-3 md:grid-cols-4">
                <select
                  value={featureWorkerId}
                  onChange={(e) => setFeatureWorkerId(e.target.value)}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
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
                <Button onClick={() => addFeatured()} className="md:col-span-2 gap-1">
                  <Plus className="w-4 h-4" /> Add to Featured
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {(featuredServices as any[]).map((f) => {
                const linkedWorker = (workers as any[]).find((w) => w.id === f.service_id);
                return (
                  <div key={f.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-card-foreground">
                        {linkedWorker?.profiles?.full_name || linkedWorker?.profession || "Service"}
                      </p>
                      <p className="text-sm text-muted-foreground">Priority: {f.priority} · {f.is_active ? "Active" : "Disabled"}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => toggleFeaturedActive(f.id, f.is_active)}>
                      {f.is_active ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeFeatured(f.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
              {featuredServices.length === 0 && <p className="text-muted-foreground text-center py-8">No featured workers yet.</p>}
            </div>
          </div>
        )}

        {tab === "ads" && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold text-card-foreground mb-3">Create Ad</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Ad title" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} />
                <Input placeholder="CTA link" value={adLink} onChange={(e) => setAdLink(e.target.value)} />
                <Input placeholder="Image URL" value={adImageUrl} onChange={(e) => setAdImageUrl(e.target.value)} />
                <Input placeholder="CTA label" value={adCtaLabel} onChange={(e) => setAdCtaLabel(e.target.value)} />
                <Input placeholder="Description" value={adDescription} onChange={(e) => setAdDescription(e.target.value)} className="md:col-span-2" />
                <div className="flex gap-2">
                  <select
                    value={adPlacement}
                    onChange={(e) => setAdPlacement(e.target.value as "home_banner" | "home_feed")}
                    className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="home_banner">Banner</option>
                    <option value="home_feed">Feed</option>
                  </select>
                  <Input placeholder="Priority" value={adPriority} onChange={(e) => setAdPriority(e.target.value)} className="w-28" />
                </div>
                <Button onClick={addAd} className="gap-1">
                  <Plus className="w-4 h-4" /> Add Ad
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {(nativeAds as any[]).map((ad) => (
                <div key={ad.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className="h-12 w-16 overflow-hidden rounded-md border bg-muted">
                    {ad.image_url ? <img src={ad.image_url} alt={ad.title} className="h-full w-full object-cover" loading="lazy" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-card-foreground truncate">{ad.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {ad.placement} · Priority {ad.priority} · {ad.is_active ? "Active" : "Disabled"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toggleAdActive(ad.id, ad.is_active)}>
                    {ad.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteAd(ad.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {nativeAds.length === 0 && <p className="text-muted-foreground text-center py-8">No ads yet.</p>}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
