import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, Pause, Play, XCircle, MapPin, Globe, Search, Plus, Minus, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type AdminCampaign = {
  id: string;
  worker_id: string;
  owner_user_id: string;
  ad_type: "local" | "international";
  status: "active" | "paused" | "expired" | "rejected";
  starts_at: string;
  ends_at: string;
  duration_days: number;
  sparks_cost: number;
  priority: number;
  created_at: string;
};

const statusStyles: Record<AdminCampaign["status"], string> = {
  active: "bg-primary/15 text-primary ring-primary/30",
  paused: "bg-yellow-500/15 text-yellow-500 ring-yellow-500/30",
  expired: "bg-muted text-muted-foreground ring-border",
  rejected: "bg-destructive/15 text-destructive ring-destructive/30",
};

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-4">
    <h2 className="text-xl font-bold tracking-tight text-hero-foreground">{title}</h2>
    {subtitle && <p className="text-sm text-hero-foreground/60">{subtitle}</p>}
  </div>
);

const SparksAdminTab = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | AdminCampaign["status"]>("all");

  /* ------- Campaigns ------- */
  const { data: campaigns = [], isLoading: cLoading } = useQuery({
    queryKey: ["admin_campaigns", statusFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("ad_campaigns")
        .select("id, worker_id, owner_user_id, ad_type, status, starts_at, ends_at, duration_days, sparks_cost, priority, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AdminCampaign[];
    },
    staleTime: 30_000,
  });

  const ownerIds = useMemo(() => Array.from(new Set(campaigns.map((c) => c.owner_user_id))), [campaigns]);
  const { data: profilesMap = {} } = useQuery({
    queryKey: ["admin_camp_profiles", ownerIds.sort().join(",")],
    queryFn: async () => {
      if (!ownerIds.length) return {} as Record<string, { name: string; phone?: string | null }>;
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", ownerIds);
      if (error) throw error;
      const m: Record<string, { name: string; phone?: string | null }> = {};
      (data || []).forEach((r: any) => (m[r.user_id] = { name: r.full_name || "Unknown", phone: r.phone }));
      return m;
    },
    enabled: ownerIds.length > 0,
  });

  const setStatus = async (id: string, status: "active" | "paused") => {
    const { error } = await (supabase as any).rpc("set_campaign_status", { _campaign_id: id, _status: status });
    if (error) return toast.error(error.message);
    toast.success(`Campaign ${status}`);
    qc.invalidateQueries({ queryKey: ["admin_campaigns"] });
  };

  const expireNow = async () => {
    const { error } = await (supabase as any).rpc("expire_campaigns");
    if (error) return toast.error(error.message);
    toast.success("Expired due campaigns");
    qc.invalidateQueries({ queryKey: ["admin_campaigns"] });
  };

  /* ------- Sparks Grant ------- */
  const [workerSearch, setWorkerSearch] = useState("");
  const [grantAmount, setGrantAmount] = useState("100");
  const [grantNotes, setGrantNotes] = useState("");
  const [granting, setGranting] = useState(false);

  const { data: workers = [] } = useQuery({
    queryKey: ["admin_workers_for_sparks", workerSearch],
    queryFn: async () => {
      const q = workerSearch.trim();
      const sel = (supabase as any).from("workers").select("id, user_id, name").limit(20);
      const { data, error } = q ? await sel.ilike("name", `%${q}%`) : await sel.order("name");
      if (error) throw error;
      return (data || []) as { id: string; user_id: string; name: string }[];
    },
    staleTime: 30_000,
  });

  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const { data: walletBal } = useQuery({
    queryKey: ["admin_wallet", selectedWorkerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sparks_wallets")
        .select("balance")
        .eq("worker_id", selectedWorkerId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.balance ?? 0) as number;
    },
    enabled: !!selectedWorkerId,
  });

  const grant = async (sign: 1 | -1) => {
    if (!selectedWorkerId) return toast.error("Pick a worker");
    const amt = sign * Math.abs(parseInt(grantAmount, 10) || 0);
    if (!amt) return toast.error("Enter an amount");
    setGranting(true);
    try {
      const { error } = await (supabase as any).rpc("grant_sparks", {
        _worker_id: selectedWorkerId,
        _amount: amt,
        _notes: grantNotes || null,
      });
      if (error) throw error;
      toast.success(`${sign > 0 ? "Granted" : "Deducted"} ${Math.abs(amt)} Sparks`);
      setGrantNotes("");
      qc.invalidateQueries({ queryKey: ["admin_wallet", selectedWorkerId] });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setGranting(false);
    }
  };

  /* ------- Pricing Rules ------- */
  const { data: rules = [] } = useQuery({
    queryKey: ["admin_pricing_rules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ad_pricing_rules").select("key, value, active, updated_at").order("key");
      if (error) throw error;
      return (data || []) as { key: string; value: any; active: boolean; updated_at: string }[];
    },
  });

  const [editing, setEditing] = useState<Record<string, string>>({});
  const saveRule = async (key: string) => {
    let parsed: any;
    try { parsed = JSON.parse(editing[key]); } catch { return toast.error("Invalid JSON"); }
    const { error } = await (supabase as any)
      .from("ad_pricing_rules")
      .update({ value: parsed, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (error) return toast.error(error.message);
    toast.success("Rule saved");
    setEditing((e) => { const n = { ...e }; delete n[key]; return n; });
    qc.invalidateQueries({ queryKey: ["admin_pricing_rules"] });
  };

  return (
    <div className="space-y-8">
      {/* CAMPAIGNS */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3 flex-wrap">
          <SectionHeader title="Sparks Campaigns" subtitle="Approve, pause or expire promoted listings." />
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(["all", "active", "paused", "expired", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as any)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${
                    statusFilter === s ? "bg-primary text-primary-foreground ring-primary" : "ring-hero-foreground/15 text-hero-foreground/70 hover:bg-hero-foreground/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={expireNow}>Expire due</Button>
          </div>
        </div>

        {cLoading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : campaigns.length === 0 ? (
          <p className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-6 text-center text-sm text-hero-foreground/60">No campaigns.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-hero-foreground/10">
            <table className="w-full text-sm">
              <thead className="bg-hero-foreground/[0.04] text-[11px] uppercase tracking-wider text-hero-foreground/60">
                <tr>
                  <th className="px-3 py-2 text-left">Worker</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Window</th>
                  <th className="px-3 py-2 text-right">Sparks</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const p = profilesMap[c.owner_user_id];
                  return (
                    <tr key={c.id} className="border-t border-hero-foreground/5 hover:bg-hero-foreground/[0.03]">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-hero-foreground">{p?.name || "—"}</p>
                        {p?.phone && <p className="text-[11px] text-hero-foreground/50">{p.phone}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-hero-foreground/80">
                          {c.ad_type === "local" ? <MapPin className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                          {c.ad_type}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${statusStyles[c.status]}`}>{c.status}</span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-hero-foreground/70">
                        {new Date(c.starts_at).toLocaleDateString()} → {new Date(c.ends_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-hero-foreground">{c.sparks_cost}</td>
                      <td className="px-3 py-2 text-right">
                        {c.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "paused")}>
                            <Pause className="mr-1 h-3 w-3" /> Pause
                          </Button>
                        )}
                        {c.status === "paused" && (
                          <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "active")}>
                            <Play className="mr-1 h-3 w-3" /> Resume
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SPARKS GRANT */}
      <section>
        <SectionHeader title="Grant Sparks" subtitle="Top up or deduct a worker's wallet." />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-hero-foreground/50" />
              <Input
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                placeholder="Search worker by name"
                className="pl-8"
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-hero-foreground/10">
              {workers.length === 0 ? (
                <p className="p-3 text-xs text-hero-foreground/50">No workers.</p>
              ) : (
                workers.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWorkerId(w.id)}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-hero-foreground/10 ${
                      selectedWorkerId === w.id ? "bg-primary/15 text-primary" : "text-hero-foreground/80"
                    }`}
                  >
                    {w.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
            {selectedWorkerId ? (
              <>
                <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-sm font-bold">Current balance: {walletBal ?? 0}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Textarea value={grantNotes} onChange={(e) => setGrantNotes(e.target.value)} placeholder="Reason for adjustment" rows={2} />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 gap-1" disabled={granting} onClick={() => grant(1)}>
                    <Plus className="h-3.5 w-3.5" /> Grant
                  </Button>
                  <Button variant="outline" className="flex-1 gap-1" disabled={granting} onClick={() => grant(-1)}>
                    <Minus className="h-3.5 w-3.5" /> Deduct
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-hero-foreground/50">Select a worker to manage their Sparks balance.</p>
            )}
          </div>
        </div>
      </section>

      {/* PRICING RULES */}
      <section>
        <SectionHeader title="Pricing Rules" subtitle="Tune cost formulas without redeploying." />
        <div className="space-y-2">
          {rules.length === 0 ? (
            <p className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-6 text-center text-sm text-hero-foreground/60">
              No pricing rules configured.
            </p>
          ) : (
            rules.map((r) => {
              const current = editing[r.key] ?? JSON.stringify(r.value, null, 2);
              const dirty = editing[r.key] !== undefined;
              return (
                <div key={r.key} className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="font-bold text-hero-foreground">{r.key}</p>
                    <div className="flex items-center gap-2">
                      {r.active ? (
                        <Badge variant="outline" className="border-primary/40 text-primary">active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-hero-foreground/50">inactive</Badge>
                      )}
                      {dirty && (
                        <Button size="sm" onClick={() => saveRule(r.key)} className="gap-1">
                          <Save className="h-3 w-3" /> Save
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={current}
                    onChange={(e) => setEditing((s) => ({ ...s, [r.key]: e.target.value }))}
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default SparksAdminTab;
