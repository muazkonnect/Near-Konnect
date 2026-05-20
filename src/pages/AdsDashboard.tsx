import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Zap, MapPin, Globe, Pause, Play, BarChart3, Plus, Loader2, Clock, Target, Search, Navigation, Check, Home as HomeIcon, Compass } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import MapLocationPickerLazy from "@/components/MapLocationPickerLazy";
import WorkerAdCard from "@/components/WorkerAdCard";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useWorkerProfile } from "@/hooks/useWorkerProfile";
import { useWorkers } from "@/hooks/useWorkers";
import { useSparksWallet, calcSparksCost } from "@/hooks/useSparks";
import { useMyCampaigns, useCampaignAnalytics, createCampaign, setCampaignStatus, type AdCampaign } from "@/hooks/useAdCampaigns";
import { getCurrentPosition, type Coords } from "@/lib/geolocation";
import { Country, State, City } from "country-state-city";

const RADII = [3, 5, 10] as const;
const INT_RADII = [3, 5, 10, 25, 50] as const;
const DURATIONS = [1, 7, 15, 30] as const;
const AUDIENCE_PER_KM2 = 220; // rough est. of active local users per km²
const estAudience = (r: number) => Math.round(Math.PI * r * r * AUDIENCE_PER_KM2);
const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const statusStyles: Record<AdCampaign["status"], string> = {
  active: "bg-primary/15 text-primary ring-primary/30",
  paused: "bg-yellow-500/15 text-yellow-500 ring-yellow-500/30",
  expired: "bg-muted text-muted-foreground ring-border",
  rejected: "bg-destructive/15 text-destructive ring-destructive/30",
};

const AdsDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { roles, isLoading: roleLoading } = useUserRole();
  const { data: workerProfile, isLoading: wpLoading } = useWorkerProfile();
  const { data: balance = 0 } = useSparksWallet();
  const { data: campaigns = [] } = useMyCampaigns();
  const campaignIds = useMemo(() => campaigns.map((c) => c.id), [campaigns]);
  const { data: analytics } = useCampaignAnalytics(campaignIds);
  

  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!roleLoading && !roles.includes("worker") && !roles.includes("admin")) {
      toast.error("Workers only.");
      navigate("/");
    }
  }, [roleLoading, roles, navigate]);

  const totals = useMemo(() => {
    let imp = 0, clk = 0, active = 0;
    for (const c of campaigns) {
      const a = analytics?.byId[c.id];
      imp += a?.impressions ?? 0;
      clk += a?.clicks ?? 0;
      if (c.status === "active") active++;
    }
    return { imp, clk, active, ctr: imp ? ((clk / imp) * 100).toFixed(1) : "0.0" };
  }, [campaigns, analytics]);

  if (wpLoading) return <AppLayout><div className="flex h-60 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppLayout>;
  if (!workerProfile) return <AppLayout><div className="p-6 text-center text-sm text-muted-foreground">Set up your worker profile first.</div></AppLayout>;

  const togglePauseResume = async (c: AdCampaign) => {
    try {
      await setCampaignStatus(c.id, c.status === "active" ? "paused" : "active");
      toast.success(c.status === "active" ? "Campaign paused" : "Campaign resumed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
    }
  };

  return (
    <AppLayout
      title="Ads Dashboard"
      subtitle="Promote your profile in the Top Rated and Nearby sections."
      action={
        <Button onClick={() => setWizardOpen(true)} size="sm" className="gap-2 rounded-full">
          <Plus className="h-4 w-4" /> New
        </Button>
      }
    >
      <div className="admin-shell -mx-4 -mt-2 min-h-screen px-4 pt-2">
      <div className="mx-auto max-w-5xl space-y-6 pb-24 pt-2">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatBox icon={Sparkles} label="Available Sparks" value={balance.toString()} accent />
          <StatBox icon={Target} label="Active" value={totals.active.toString()} />
          <StatBox icon={BarChart3} label="Impressions" value={totals.imp.toString()} />
          <StatBox icon={Zap} label="CTR" value={`${totals.ctr}%`} />
        </div>

        {analytics?.daily && analytics.daily.length > 0 && (
          <DailyChart daily={analytics.daily} />
        )}

        <div className="space-y-3">
          <h2 className="px-1 text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Campaigns</h2>
          {campaigns.length === 0 ? (
            <EmptyState onCreate={() => setWizardOpen(true)} />
          ) : (
            campaigns.map((c) => {
              const a = analytics?.byId[c.id] ?? { impressions: 0, clicks: 0 };
              const ctr = a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(1) : "0.0";
              const target = c.ad_geo_targets?.[0];
              return (
                <div key={c.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${statusStyles[c.status]}`}>
                          {c.status}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {c.ad_type === "local" ? <MapPin className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                          {c.ad_type}
                        </span>
                        <span className="text-xs text-muted-foreground">{target?.radius_km ?? "—"} km radius</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">
                        {c.duration_days} day{c.duration_days > 1 ? "s" : ""} · {formatDate(c.starts_at)} → {formatDate(c.ends_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">Spent {c.sparks_cost} Sparks</p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-lg font-bold leading-none">{a.impressions}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Impr.</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold leading-none">{a.clicks}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Clicks</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold leading-none">{ctr}%</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">CTR</p>
                      </div>
                      {c.status !== "expired" && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => togglePauseResume(c)}>
                          {c.status === "active" ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Resume</>}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </div>


      <CampaignWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        workerId={workerProfile.id}
        defaultCenter={
          workerProfile.latitude != null && workerProfile.longitude != null
            ? { latitude: workerProfile.latitude, longitude: workerProfile.longitude }
            : null
        }
        balance={balance}
      />
    </AppLayout>
  );
};

const StatBox = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) => (
  <div className={`rounded-2xl border p-4 ${accent ? "border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5" : "bg-card"}`}>
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
    </div>
    <p className="mt-1.5 text-2xl font-extrabold">{value}</p>
  </div>
);

const DailyChart = ({ daily }: { daily: { date: string; impressions: number; clicks: number }[] }) => {
  const W = 600, H = 120, P = 8;
  const maxImp = Math.max(1, ...daily.map((d) => d.impressions));
  const maxClk = Math.max(1, ...daily.map((d) => d.clicks));
  const max = Math.max(maxImp, maxClk);
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(daily.length - 1, 1);
  const y = (v: number) => H - P - ((H - 2 * P) * v) / max;
  const path = (key: "impressions" | "clicks") =>
    daily.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Last 14 days</p>
        <div className="flex gap-3 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Impressions</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-foreground/60" /> Clicks</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full">
        <path d={path("impressions")} stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
        <path d={path("clicks")} stroke="hsl(var(--foreground) / 0.6)" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{daily[0]?.date.slice(5)}</span>
        <span>{daily[daily.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
};

const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <div className="rounded-2xl border-2 border-dashed bg-muted/30 p-8 text-center">
    <Sparkles className="mx-auto h-8 w-8 text-primary" />
    <p className="mt-2 text-sm font-semibold">No campaigns yet</p>
    <p className="mt-1 text-xs text-muted-foreground">Launch your first promoted listing to appear on the homepage.</p>
    <Button className="mt-4 gap-2 rounded-full" onClick={onCreate}><Plus className="h-4 w-4" /> Create Campaign</Button>
  </div>
);

/* -------------------- Wizard -------------------- */
const CampaignWizard = ({
  open, onOpenChange, workerId, defaultCenter, balance,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workerId: string;
  defaultCenter: Coords | null;
  balance: number;
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [adType, setAdType] = useState<"local" | "international">("local");
  const [radius, setRadius] = useState<number>(5);
  const [duration, setDuration] = useState<number>(7);
  const [center, setCenter] = useState<Coords | null>(defaultCenter);
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [cityName, setCityName] = useState("");
  const [areaText, setAreaText] = useState("");
  const [cost, setCost] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const countryName = useMemo(() => Country.getCountryByCode(countryCode)?.name || "", [countryCode]);
  const stateName = useMemo(
    () => (countryCode && stateCode ? State.getStateByCodeAndCountry(stateCode, countryCode)?.name || "" : ""),
    [countryCode, stateCode]
  );
  const states = useMemo(() => (countryCode ? State.getStatesOfCountry(countryCode) : []), [countryCode]);
  const cities = useMemo(
    () => (countryCode && stateCode ? City.getCitiesOfState(countryCode, stateCode) : []),
    [countryCode, stateCode]
  );
  const allCountries = useMemo(() => Country.getAllCountries(), []);

  const { data: workers = [] } = useWorkers();
  const previewWorker = useMemo(() => {
    const w = workers.find((x) => x.id === workerId);
    return w ? { ...w, distance: 0.5 } : null;
  }, [workers, workerId]);

  useEffect(() => {
    if (!open) return;
    setStep(0); setAdType("local"); setRadius(5); setDuration(7);
    setCenter(defaultCenter); setCountryCode(""); setStateCode(""); setCityName(""); setAreaText("");
  }, [open, defaultCenter]);

  // Apply a Nominatim search result to the cascade + map
  const applySearchResult = (r: NominatimResult) => {
    const addr = r.address || {};
    const iso = (addr.country_code || "").toUpperCase();
    if (iso) {
      const country = Country.getCountryByCode(iso);
      if (country) {
        setCountryCode(iso);
        const stateNm = addr.state || addr.region || addr.province || "";
        const st = State.getStatesOfCountry(iso).find(
          (s) => s.name.toLowerCase() === stateNm.toLowerCase() || s.isoCode === stateNm,
        );
        if (st) {
          setStateCode(st.isoCode);
          const cityNm = addr.city || addr.town || addr.village || addr.county || "";
          const c = City.getCitiesOfState(iso, st.isoCode).find(
            (c) => c.name.toLowerCase() === cityNm.toLowerCase(),
          );
          setCityName(c?.name || cityNm || "");
        } else {
          setStateCode(""); setCityName("");
        }
      }
    }
    setAreaText(addr.suburb || addr.neighbourhood || addr.road || r.display_name.split(",")[0] || "");
    const lat = Number(r.lat); const lng = Number(r.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) setCenter({ latitude: lat, longitude: lng });
  };


  useEffect(() => {
    let cancelled = false;
    calcSparksCost(adType, radius, duration).then((c) => { if (!cancelled) setCost(c); }).catch(() => {});
    return () => { cancelled = true; };
  }, [adType, radius, duration]);

  const useMyLocation = async () => {
    try {
      const c = await getCurrentPosition();
      setCenter(c);
    } catch {
      toast.error("Could not access your location.");
    }
  };

  const launch = async () => {
    if (adType === "international") {
      if (!countryCode) return toast.error("Select a country.");
      if (!center) {
        // try to derive center from selected city/state/country
        const cityObj = cityName && cities.find((c) => c.name === cityName);
        const stateObj = stateCode ? states.find((s) => s.isoCode === stateCode) : null;
        const countryObj = Country.getCountryByCode(countryCode);
        const lat = Number(cityObj?.latitude ?? stateObj?.latitude ?? countryObj?.latitude);
        const lng = Number(cityObj?.longitude ?? stateObj?.longitude ?? countryObj?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setCenter({ latitude: lat, longitude: lng });
        } else {
          return toast.error("Pin a center on the map.");
        }
      }
    }
    if (!center) return toast.error("Set a location first.");
    if (cost > balance) {
      toast.error(`Need ${cost - balance} more Sparks.`, {
        action: { label: "Buy Sparks", onClick: () => navigate("/wallet/buy") },
      });
      return;
    }
    setSubmitting(true);
    try {
      await createCampaign({
        workerId, adType, durationDays: duration, radiusKm: radius,
        centerLat: center.latitude, centerLng: center.longitude,
        country: adType === "international" ? countryName || null : null,
        city: adType === "international" ? [cityName, stateName].filter(Boolean).join(", ") || null : null,
        area: adType === "international" ? areaText || null : null,
      });

      toast.success("Campaign launched 🚀");
      queryClient.invalidateQueries({ queryKey: ["sparks_wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["my_campaigns"] });
      onOpenChange(false);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("INSUFFICIENT_SPARKS")) toast.error("Not enough Sparks.");
      else toast.error(msg || "Failed to launch");
    } finally {
      setSubmitting(false);
    }
  };

  const radiusOptions = adType === "local" ? RADII : INT_RADII;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-shell max-h-[92vh] max-w-2xl overflow-y-auto bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {["Where", "Reach", "Duration", "Review"].map((label, i) => (
            <div key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <p className="text-base font-bold">Where do you want your ad to appear?</p>
              <p className="text-xs text-muted-foreground">Pick a vibe — we'll handle the rest.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TargetCard
                active={adType === "local"}
                icon={MapPin}
                title="Nearby Customers"
                desc="Show your ad around your current location"
                badge="Recommended"
                onClick={async () => {
                  setAdType("local");
                  if (!center) { try { setCenter(await getCurrentPosition()); } catch { /* user can pin manually */ } }
                }}
              />
              <TargetCard
                active={adType === "international"}
                icon={Globe}
                title="Target Another Area"
                desc="Choose another city, country or region"
                onClick={() => setAdType("international")}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {adType === "international" && (
              <div>
                <p className="mb-2 text-sm font-semibold">Search a place</p>
                <AddressSearch onSelect={applySearchResult} />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Try “Dubai Marina”, “Lahore DHA”, “Manhattan”…
                </p>
              </div>
            )}

            {adType === "local" && !center && (
              <Button type="button" variant="outline" size="sm" onClick={useMyLocation} className="w-full gap-2">
                <Navigation className="h-4 w-4" /> Use my current location
              </Button>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold">How far should your ad reach?</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {radiusOptions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadius(r)}
                    className={`rounded-2xl border-2 px-3 py-3 text-center font-bold transition active:scale-95 ${
                      radius === r
                        ? "border-primary bg-primary/15 text-primary shadow-md shadow-primary/20"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="text-lg leading-none">{r}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider opacity-70">km</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <MapLocationPickerLazy value={center} onChange={setCenter} radiusKm={radius} />
            </div>

            <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selected</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-bold">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {adType === "local"
                      ? center ? "Your current area" : "Detecting location…"
                      : [areaText, cityName, stateName, countryName].filter(Boolean).join(", ") || "Search a place above"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Est. reach</p>
                  <p className="text-lg font-extrabold text-primary">~{fmtNum(estAudience(radius))}</p>
                </div>
              </div>
            </div>
          </div>
        )}



        {step === 2 && (
          <div className="space-y-3">
            <Label>Duration</Label>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className={`rounded-xl border p-3 text-center transition ${duration === d ? "border-primary bg-primary/10" : "hover:bg-muted"}`}>
                  <p className="text-lg font-extrabold">{d}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">day{d > 1 ? "s" : ""}</p>
                </button>
              ))}
            </div>
            <div className="rounded-xl border bg-muted/30 p-3 text-sm">
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Ends on {new Date(Date.now() + duration * 86400000).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>Type: <b className="capitalize">{adType}</b></li>
                <li>Radius: <b>{radius} km</b></li>
                <li>Duration: <b>{duration} days</b></li>
                {adType === "international" && (
                  <li>Target: <b>{[areaText, cityName, stateName, countryName].filter(Boolean).join(", ") || "—"}</b></li>
                )}

              </ul>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/15 to-primary/5 p-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cost</p>
                <p className="flex items-center gap-1.5 text-2xl font-extrabold text-primary"><Sparkles className="h-5 w-5" /> {cost}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Balance</p>
                <p className={`text-lg font-bold ${balance < cost ? "text-destructive" : ""}`}>{balance}</p>
              </div>
            </div>
            {previewWorker && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live preview</p>
                <div className="rounded-2xl bg-hero p-3">
                  <WorkerAdCard worker={previewWorker as any} isAuthed={true} premium />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !center}>Next</Button>
          ) : (
            <Button onClick={launch} disabled={submitting || cost > balance} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Launch ({cost} Sparks)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TargetCard = ({ active, icon: Icon, title, desc, badge, onClick }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={`group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.98] ${
      active
        ? "border-primary bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg shadow-primary/20"
        : "border-border bg-card hover:border-primary/40 hover:shadow-md"
    }`}
  >
    {badge && (
      <span className="absolute right-3 top-3 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
        {badge}
      </span>
    )}
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
      <Icon className="h-5 w-5" />
    </div>
    <p className="mt-3 text-base font-extrabold">{title}</p>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
    {active && (
      <span className="absolute bottom-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-3 w-3" />
      </span>
    )}
  </button>
);


interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    country_code?: string;
    country?: string;
    state?: string;
    region?: string;
    province?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    suburb?: string;
    neighbourhood?: string;
    road?: string;
  };
}

const AddressSearch = ({ onSelect }: { onSelect: (r: NominatimResult) => void }) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (q.trim().length < 3) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const json = (await res.json()) as NominatimResult[];
        setResults(json);
        setOpen(true);
      } catch { /* aborted */ }
      finally { setLoading(false); }
    }, 350);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [q]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search any city, street, or landmark worldwide…"
          className="pl-9"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg">
          {results.map((r) => (
            <button
              key={r.place_id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(r); setQ(r.display_name); setOpen(false); }}
              className="flex w-full items-start gap-2 border-b border-border/40 px-3 py-2 text-left text-sm last:border-0 hover:bg-accent hover:text-accent-foreground"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdsDashboard;
