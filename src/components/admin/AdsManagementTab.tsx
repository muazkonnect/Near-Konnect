import { useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  CheckCircle,
  MapPin,
  Upload,
  Image as ImageIcon,
  Calendar,
  Eye,
  MousePointerClick,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NativeAdCard from "@/components/NativeAdCard";
import type { NativeAd } from "@/hooks/useSponsored";
import MapLocationPicker from "@/components/MapLocationPicker";
import { calculateDistance, type Coords } from "@/lib/geolocation";
import { useAuth } from "@/contexts/AuthContext";

type Placement = "home_banner" | "home_feed" | "home_inline" | "landing_mid" | "landing_final";

const PLACEMENT_OPTIONS: { value: Placement; label: string; hint: string; variant: "banner" | "feed" | "inline" }[] = [
  { value: "home_banner", label: "Home — Banner", hint: "Wide banner above feed (signed-in)", variant: "banner" },
  { value: "home_feed", label: "Home — Feed card", hint: "Card inside services grid", variant: "feed" },
  { value: "home_inline", label: "Home — Inline", hint: "Subtle row between sections", variant: "inline" },
  { value: "landing_mid", label: "Landing — Mid", hint: "Subtle inline between How-it-works and Why-us", variant: "inline" },
  { value: "landing_final", label: "Landing — Final", hint: "Card before final CTA", variant: "feed" },
];

const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
    <div>
      <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const StatChip = ({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string | number }) => (
  <div className="rounded-xl border bg-card px-3 py-2">
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3 w-3" /> {label}
    </div>
    <p className="mt-0.5 text-sm font-bold text-card-foreground tabular-nums">{value}</p>
  </div>
);

const AdsManagementTab = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // form state
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [adTitle, setAdTitle] = useState("");
  const [adDescription, setAdDescription] = useState("");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adLink, setAdLink] = useState("");
  const [adCtaLabel, setAdCtaLabel] = useState("Learn More");
  const [adPlacement, setAdPlacement] = useState<Placement>("home_feed");
  const [adPriority, setAdPriority] = useState("100");
  const [adStartsAt, setAdStartsAt] = useState("");
  const [adEndsAt, setAdEndsAt] = useState("");
  const [adTargetCoords, setAdTargetCoords] = useState<Coords | null>(null);
  const [adRadiusKm, setAdRadiusKm] = useState("3");
  const [uploading, setUploading] = useState(false);
  const [viewerCoords, setViewerCoords] = useState<Coords | null>(null);

  // queries
  const { data: nativeAds = [] } = useQuery({
    queryKey: ["admin_native_ads"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("native_ads")
        .select(
          "id, title, description, image_url, cta_url, cta_label, placement, ad_type, priority, is_active, created_at, starts_at, ends_at, target_latitude, target_longitude, target_radius_km"
        )
        .order("priority", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: stats = [] } = useQuery({
    queryKey: ["admin_ad_stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_ad_stats", { _days: 30 });
      if (error) throw error;
      return (data as any[]) || [];
    },
    refetchInterval: 30_000,
  });

  const statsByAd = useMemo(() => {
    const m = new Map<string, { impressions: number; clicks: number; ctr: number }>();
    for (const r of stats as any[]) m.set(r.ad_id, { impressions: Number(r.impressions), clicks: Number(r.clicks), ctr: Number(r.ctr) });
    return m;
  }, [stats]);

  const totals = useMemo(() => {
    let i = 0,
      c = 0;
    for (const v of statsByAd.values()) {
      i += v.impressions;
      c += v.clicks;
    }
    const ctr = i > 0 ? Math.round((c / i) * 1000) / 10 : 0;
    return { impressions: i, clicks: c, ctr };
  }, [statsByAd]);

  const resetForm = () => {
    setEditingAdId(null);
    setAdTitle("");
    setAdDescription("");
    setAdImageUrl("");
    setAdLink("");
    setAdCtaLabel("Learn More");
    setAdPlacement("home_feed");
    setAdPriority("100");
    setAdStartsAt("");
    setAdEndsAt("");
    setAdTargetCoords(null);
    setAdRadiusKm("3");
  };

  const startEditing = (ad: any) => {
    setEditingAdId(ad.id);
    setAdTitle(ad.title || "");
    setAdDescription(ad.description || "");
    setAdImageUrl(ad.image_url || "");
    setAdLink(ad.cta_url || "");
    setAdCtaLabel(ad.cta_label || "Learn More");
    setAdPlacement(ad.placement);
    setAdPriority(String(ad.priority || "100"));
    setAdStartsAt(ad.starts_at ? new Date(ad.starts_at).toISOString().slice(0, 16) : "");
    setAdEndsAt(ad.ends_at ? new Date(ad.ends_at).toISOString().slice(0, 16) : "");
    if (ad.target_latitude && ad.target_longitude) {
      setAdTargetCoords({ latitude: ad.target_latitude, longitude: ad.target_longitude });
      setAdRadiusKm(String(ad.target_radius_km || "3"));
    } else {
      setAdTargetCoords(null);
      setAdRadiusKm("3");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5 MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `ads/${user?.id || "anon"}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ad-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("ad-images").getPublicUrl(path);
      setAdImageUrl(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const buildPayload = () => {
    const radius = adRadiusKm.trim() ? Number(adRadiusKm) : null;
    return {
      title: adTitle.trim(),
      description: adDescription.trim() || null,
      image_url: adImageUrl.trim() || null,
      cta_url: adLink.trim(),
      cta_label: adCtaLabel.trim() || "Learn More",
      placement: adPlacement,
      ad_type: adPlacement === "home_banner" ? "banner" : adPlacement === "home_inline" || adPlacement === "landing_mid" ? "inline" : "in_feed",
      priority: Number(adPriority) || 100,
      starts_at: adStartsAt ? new Date(adStartsAt).toISOString() : null,
      ends_at: adEndsAt ? new Date(adEndsAt).toISOString() : null,
      target_latitude: adTargetCoords?.latitude ?? null,
      target_longitude: adTargetCoords?.longitude ?? null,
      target_radius_km: adTargetCoords ? radius : null,
    };
  };

  const validate = () => {
    if (!adTitle.trim() || !adLink.trim()) {
      toast.error("Title and CTA link are required");
      return false;
    }
    if (adTargetCoords) {
      const r = Number(adRadiusKm);
      if (!r || r <= 0) {
        toast.error("Set a positive radius for geo-targeting");
        return false;
      }
    }
    if (adStartsAt && adEndsAt && new Date(adEndsAt) <= new Date(adStartsAt)) {
      toast.error("End date must be after start date");
      return false;
    }
    return true;
  };

  const addAd = async () => {
    if (!validate()) return;
    const { error } = await (supabase as any).from("native_ads").insert({
      ...buildPayload(),
      is_active: true,
      created_by: user?.id || null,
    });
    if (error) return toast.error("Failed to create ad");
    toast.success("Ad created");
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
  };

  const updateAd = async () => {
    if (!editingAdId || !validate()) return;
    const { error } = await (supabase as any).from("native_ads").update(buildPayload()).eq("id", editingAdId);
    if (error) return toast.error("Failed to update ad");
    toast.success("Ad updated");
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
  };

  const toggleAdActive = async (id: string, active: boolean) => {
    const { error } = await (supabase as any).from("native_ads").update({ is_active: !active }).eq("id", id);
    if (error) return toast.error("Failed to update");
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
  };

  const deleteAd = async (id: string) => {
    if (!confirm("Delete this ad? Tracking events will also be removed.")) return;
    const { error } = await (supabase as any).from("native_ads").delete().eq("id", id);
    if (error) return toast.error("Failed to delete");
    toast.success("Ad deleted");
    queryClient.invalidateQueries({ queryKey: ["admin_native_ads"] });
  };

  const adsWithMeta = useMemo(() => {
    return (nativeAds as any[]).map((ad) => {
      const hasTarget =
        ad.target_latitude != null && ad.target_longitude != null && (ad.target_radius_km ?? 0) > 0;
      let distanceKm: number | null = null;
      let inRadius: boolean | null = null;
      if (hasTarget && viewerCoords) {
        distanceKm = calculateDistance(viewerCoords.latitude, viewerCoords.longitude, ad.target_latitude, ad.target_longitude);
        inRadius = distanceKm <= ad.target_radius_km;
      } else if (!hasTarget) {
        inRadius = true;
      }
      const now = new Date();
      const scheduled = ad.starts_at && new Date(ad.starts_at) > now;
      const expired = ad.ends_at && new Date(ad.ends_at) < now;
      return { ad, hasTarget, distanceKm, inRadius, scheduled, expired };
    });
  }, [nativeAds, viewerCoords]);

  const currentVariant = PLACEMENT_OPTIONS.find((p) => p.value === adPlacement)?.variant || "feed";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Ads & Campaigns"
        subtitle="Create native ads, schedule campaigns, target by location, and track performance."
      />

      {/* TOTALS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total ads</p>
          <p className="mt-1 text-2xl font-bold text-card-foreground tabular-nums">{nativeAds.length}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Impressions (30d)</p>
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-1 text-2xl font-bold text-card-foreground tabular-nums">{totals.impressions.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Clicks (30d)</p>
            <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-1 text-2xl font-bold text-card-foreground tabular-nums">{totals.clicks.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-hero p-4 text-hero-foreground">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-hero-foreground/70">CTR (30d)</p>
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">{totals.ctr}%</p>
        </motion.div>
      </div>

      {/* CREATE / EDIT */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {editingAdId ? "Edit ad" : "Create new ad"}
          </h3>
          {editingAdId && (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel edit
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Left: form fields */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={adTitle} onChange={(e) => setAdTitle(e.target.value)} placeholder="e.g. 50% off this week only" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={adDescription}
                onChange={(e) => setAdDescription(e.target.value)}
                placeholder="Short supporting line"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">CTA link *</Label>
                <Input value={adLink} onChange={(e) => setAdLink(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">CTA label</Label>
                <Input value={adCtaLabel} onChange={(e) => setAdCtaLabel(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Placement</Label>
                <select
                  value={adPlacement}
                  onChange={(e) => setAdPlacement(e.target.value as Placement)}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PLACEMENT_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {PLACEMENT_OPTIONS.find((p) => p.value === adPlacement)?.hint}
                </p>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Input type="number" value={adPriority} onChange={(e) => setAdPriority(e.target.value)} />
              </div>
            </div>

            {/* Scheduling */}
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-card-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Scheduling (optional)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Starts at</Label>
                  <Input type="datetime-local" value={adStartsAt} onChange={(e) => setAdStartsAt(e.target.value)} />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Ends at</Label>
                  <Input type="datetime-local" value={adEndsAt} onChange={(e) => setAdEndsAt(e.target.value)} />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Leave both empty for an always-on ad. Outside this window, the ad is automatically hidden.
              </p>
            </div>
          </div>

          {/* Right: image upload + live preview */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Ad image</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  value={adImageUrl}
                  onChange={(e) => setAdImageUrl(e.target.value)}
                  placeholder="Image URL or upload"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="shrink-0 gap-1"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading" : "Upload"}
                </Button>
              </div>
              {adImageUrl ? (
                <div className="mt-2 overflow-hidden rounded-lg border">
                  <img src={adImageUrl} alt="" className="h-32 w-full object-cover" />
                </div>
              ) : (
                <div className="mt-2 flex h-32 items-center justify-center rounded-lg border border-dashed bg-muted/20 text-muted-foreground">
                  <ImageIcon className="mr-2 h-4 w-4" /> No image yet
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Live preview</Label>
              <div className="mt-1 rounded-xl border bg-background p-3">
                {adTitle.trim() && adLink.trim() ? (
                  <NativeAdCard
                    preview
                    variant={currentVariant}
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
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">Add a title and CTA link to preview.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Geo-targeting */}
        <div className="mt-5 rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-card-foreground">Geo-targeting (optional)</p>
                <p className="text-xs text-muted-foreground">
                  Tap the map to set a center. Default radius 3 km. Leave empty for global delivery.
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
                <Button variant="ghost" size="sm" onClick={() => setAdTargetCoords(null)}>
                  Clear
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border" style={{ height: 260 }}>
            <MapLocationPicker value={adTargetCoords} onChange={setAdTargetCoords} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {editingAdId ? (
            <Button onClick={updateAd} className="gap-1">
              <CheckCircle className="h-4 w-4" /> Save changes
            </Button>
          ) : (
            <Button onClick={addAd} className="gap-1">
              <Plus className="h-4 w-4" /> Create ad
            </Button>
          )}
        </div>
      </div>

      {/* TEST VIEWER LOCATION */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Test viewer location</h3>
            <p className="text-xs text-muted-foreground">
              Pretend to be a user at this point on the map. Distances and IN/OUT status update below.
            </p>
          </div>
          {viewerCoords && (
            <Button variant="ghost" size="sm" onClick={() => setViewerCoords(null)}>
              Clear viewer
            </Button>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border" style={{ height: 220 }}>
          <MapLocationPicker value={viewerCoords} onChange={setViewerCoords} />
        </div>
      </div>

      {/* ALL ADS */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">All ads ({nativeAds.length})</h3>
        {adsWithMeta.length === 0 && (
          <p className="rounded-2xl border bg-card py-8 text-center text-muted-foreground">No ads yet. Create your first one above.</p>
        )}
        {adsWithMeta.map(({ ad, hasTarget, distanceKm, inRadius, scheduled, expired }) => {
          const s = statsByAd.get(ad.id) || { impressions: 0, clicks: 0, ctr: 0 };
          return (
            <div key={ad.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {ad.image_url ? (
                    <img src={ad.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-[200px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-card-foreground">{ad.title}</p>
                    <Badge variant="outline" className="text-[10px]">{ad.placement}</Badge>
                    <Badge variant="outline" className="text-[10px]">P{ad.priority}</Badge>
                    {!ad.is_active && <Badge variant="secondary" className="text-[10px]">Disabled</Badge>}
                    {scheduled && <Badge className="bg-warning text-warning-foreground text-[10px]">Scheduled</Badge>}
                    {expired && <Badge className="bg-destructive text-destructive-foreground text-[10px]">Expired</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hasTarget
                      ? `📍 ${ad.target_latitude.toFixed(3)}, ${ad.target_longitude.toFixed(3)} · ${ad.target_radius_km} km`
                      : "🌍 Global"}
                    {ad.starts_at && ` · from ${new Date(ad.starts_at).toLocaleDateString()}`}
                    {ad.ends_at && ` · to ${new Date(ad.ends_at).toLocaleDateString()}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StatChip icon={Eye} label="Impr." value={s.impressions} />
                  <StatChip icon={MousePointerClick} label="Clicks" value={s.clicks} />
                  <StatChip icon={TrendingUp} label="CTR" value={`${s.ctr}%`} />
                  {hasTarget && viewerCoords && distanceKm != null && (
                    <Badge className={inRadius ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                      {distanceKm.toFixed(2)} km · {inRadius ? "IN" : "OUT"}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleAdActive(ad.id, ad.is_active)}>
                    {ad.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startEditing(ad)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteAd(ad.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdsManagementTab;
