import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Zap, MapPin, Globe, Pause, Play, BarChart3, Plus, Loader2, Clock, Target, Wallet } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import MapLocationPickerLazy from "@/components/MapLocationPickerLazy";
import WorkerAdCard from "@/components/WorkerAdCard";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useWorkerProfile } from "@/hooks/useWorkerProfile";
import { useWorkers } from "@/hooks/useWorkers";
import { useSparksWallet, useSparksTransactions, calcSparksCost } from "@/hooks/useSparks";
import { useMyCampaigns, useCampaignAnalytics, createCampaign, setCampaignStatus, type AdCampaign } from "@/hooks/useAdCampaigns";
import { getCurrentPosition, type Coords } from "@/lib/geolocation";
import { Country, State, City } from "country-state-city";

const RADII = [5, 10, 15] as const;
const DURATIONS = [1, 7, 15, 30] as const;

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
  const { data: txs = [] } = useSparksTransactions();

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
    <AppLayout>
      <div className="admin-shell -mx-4 -mt-2 min-h-screen px-4 pt-2">
      <div className="mx-auto max-w-5xl space-y-6 pb-24 pt-2">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Ads Dashboard</h1>
            <p className="text-sm text-muted-foreground">Promote your profile in the Top Rated, 5/10/15 KM sections.</p>
          </div>
          <Button onClick={() => setWizardOpen(true)} className="gap-2 rounded-full">
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatBox icon={Wallet} label="Sparks" value={balance.toString()} accent />
          <StatBox icon={Target} label="Active" value={totals.active.toString()} />
          <StatBox icon={BarChart3} label="Impressions" value={totals.imp.toString()} />
          <StatBox icon={Zap} label="CTR" value={`${totals.ctr}%`} />
        </div>

        {analytics?.daily && analytics.daily.length > 0 && (
          <DailyChart daily={analytics.daily} />
        )}

        <Tabs defaultValue="campaigns">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="wallet">Sparks Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-3">
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
          </TabsContent>

          <TabsContent value="wallet" className="space-y-3">
            <div className="rounded-2xl border bg-gradient-to-br from-primary/15 to-primary/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current balance</p>
              <p className="mt-1 flex items-center gap-2 text-3xl font-extrabold text-primary">
                <Sparkles className="h-6 w-6" /> {balance}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Contact an admin to top up your Sparks.</p>
            </div>
            <div className="rounded-2xl border bg-card">
              <p className="border-b px-4 py-3 text-sm font-semibold">Recent transactions</p>
              {txs.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No transactions yet.</p>
              ) : (
                <ul className="divide-y">
                  {txs.map((t) => (
                    <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div>
                        <p className="font-semibold capitalize">{t.reason.replace("_", " ")}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`font-extrabold ${t.delta > 0 ? "text-primary" : "text-destructive"}`}>
                        {t.delta > 0 ? "+" : ""}{t.delta}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
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
  const [step, setStep] = useState(0);
  const [adType, setAdType] = useState<"local" | "international">("local");
  const [radius, setRadius] = useState<number>(5);
  const [duration, setDuration] = useState<number>(7);
  const [center, setCenter] = useState<Coords | null>(defaultCenter);
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [cost, setCost] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const { data: workers = [] } = useWorkers();
  const previewWorker = useMemo(() => {
    const w = workers.find((x) => x.id === workerId);
    return w ? { ...w, distance: 0.5 } : null;
  }, [workers, workerId]);

  useEffect(() => {
    if (!open) return;
    setStep(0); setAdType("local"); setRadius(5); setDuration(7);
    setCenter(defaultCenter); setCountry(""); setCity(""); setArea("");
  }, [open, defaultCenter]);

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
    if (!center) return toast.error("Set a location first.");
    if (cost > balance) return toast.error(`Need ${cost - balance} more Sparks. Ask an admin to top up.`);
    setSubmitting(true);
    try {
      await createCampaign({
        workerId, adType, durationDays: duration, radiusKm: radius,
        centerLat: center.latitude, centerLng: center.longitude,
        country: adType === "international" ? country || null : null,
        city: adType === "international" ? city || null : null,
        area: adType === "international" ? area || null : null,
      });
      toast.success("Campaign launched 🚀");
      onOpenChange(false);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("INSUFFICIENT_SPARKS")) toast.error("Not enough Sparks.");
      else toast.error(msg || "Failed to launch");
    } finally {
      setSubmitting(false);
    }
  };

  const radiusOptions = adType === "local" ? RADII : ([10, 25, 50, 100, 250] as const);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {["Type", "Target", "Duration", "Review"].map((label, i) => (
            <div key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">What type of campaign?</p>
            <div className="grid grid-cols-2 gap-3">
              <TypeCard active={adType === "local"} icon={MapPin} title="Local" desc="Target your immediate vicinity (5/10/15 km)" onClick={() => setAdType("local")} />
              <TypeCard active={adType === "international"} icon={Globe} title="International" desc="Country/city + custom radius" onClick={() => setAdType("international")} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {adType === "local" ? (
              <>
                <div>
                  <Label>Center (your current GPS location)</Label>
                  <div className="mt-2"><MapLocationPickerLazy value={center} onChange={setCenter} /></div>
                  <Button type="button" variant="outline" size="sm" onClick={useMyLocation} className="mt-2 w-full">
                    Use my current location
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pakistan" /></div>
                  <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lahore" /></div>
                </div>
                <div><Label>Area / Region</Label><Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Gulberg" /></div>
                <div>
                  <Label>Pin center on map</Label>
                  <div className="mt-2"><MapLocationPickerLazy value={center} onChange={setCenter} /></div>
                </div>
              </>
            )}

            <div>
              <Label>Radius</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {radiusOptions.map((r) => (
                  <button key={r} type="button" onClick={() => setRadius(r)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${radius === r ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>
                    {r} km
                  </button>
                ))}
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
                  <li>Target: <b>{[area, city, country].filter(Boolean).join(", ") || "—"}</b></li>
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

const TypeCard = ({ active, icon: Icon, title, desc, onClick }: any) => (
  <button type="button" onClick={onClick}
    className={`rounded-2xl border p-4 text-left transition ${active ? "border-primary bg-primary/10 shadow-md" : "hover:bg-muted"}`}>
    <Icon className={`h-6 w-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
    <p className="mt-2 text-sm font-bold">{title}</p>
    <p className="text-xs text-muted-foreground">{desc}</p>
  </button>
);

export default AdsDashboard;
