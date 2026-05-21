import { useMemo, useState } from "react";
import {
  Sparkles, Pause, Play, MapPin, Globe, Search, Plus, Minus, Save, Loader2,
  CheckCircle2, XCircle, Image as ImageIcon, Package, Settings2, Receipt, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminFetchPendingPayments, adminApprovePayment, adminRejectPayment,
  adminCreditSparks, adminDebitSparks,
  adminFetchAllPackages, adminUpsertPackage, adminDeletePackage,
  fetchPaymentSettings, adminUpdatePaymentSettings,
  getProofSignedUrl,
  type PaymentRequest, type SparksPackage, type PaymentSettings,
} from "@/services/walletService";

const sb = supabase as any;

type AdminCampaign = {
  id: string; worker_id: string; owner_user_id: string;
  ad_type: "local" | "international"; status: "active" | "paused" | "expired" | "rejected";
  placement_type: "homepage" | "explore";
  starts_at: string; ends_at: string; duration_days: number; sparks_cost: number; created_at: string;
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

/* ---------------- Pending Payments ---------------- */
const PendingPaymentsPanel = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin_payment_requests"],
    queryFn: adminFetchPendingPayments,
    refetchInterval: 15_000,
  });

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const userIds = useMemo(() => Array.from(new Set(filtered.map((r) => r.user_id))), [filtered]);
  const { data: profiles = {} } = useQuery({
    queryKey: ["admin_pr_profiles", userIds.sort().join(",")],
    queryFn: async () => {
      if (!userIds.length) return {} as Record<string, { name: string; phone: string | null }>;
      const { data } = await sb.from("profiles").select("user_id, full_name, phone").in("user_id", userIds);
      const m: Record<string, any> = {};
      (data || []).forEach((r: any) => (m[r.user_id] = { name: r.full_name || "Unknown", phone: r.phone }));
      return m;
    },
    enabled: userIds.length > 0,
  });

  const openProof = async (path: string | null) => {
    if (!path) return toast.error("No proof attached");
    const url = await getProofSignedUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Could not open proof");
  };

  const approve = async (id: string) => {
    try {
      await adminApprovePayment(id, note);
      toast.success("Payment approved – Sparks credited");
      setNote(""); setNoteFor(null);
      qc.invalidateQueries({ queryKey: ["admin_payment_requests"] });
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  };
  const reject = async (id: string) => {
    try {
      await adminRejectPayment(id, note);
      toast.success("Payment rejected");
      setNote(""); setNoteFor(null);
      qc.invalidateQueries({ queryKey: ["admin_payment_requests"] });
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  };

  return (
    <section>
      <SectionHeader title="Payment Requests" subtitle="Approve or reject Sparks top-ups." />
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${
              filter === s ? "bg-primary text-primary-foreground ring-primary"
                           : "ring-hero-foreground/15 text-hero-foreground/70 hover:bg-hero-foreground/10"
            }`}
          >{s}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-6 text-center text-sm text-hero-foreground/60">No requests.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const p = profiles[r.user_id];
            const active = noteFor === r.id;
            return (
              <div key={r.id} className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-hero-foreground">{p?.name || "Unknown"}{p?.phone && <span className="ml-2 text-[11px] font-normal text-hero-foreground/50">{p.phone}</span>}</p>
                    <p className="text-[11px] text-hero-foreground/50">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className={
                    r.status === "approved" ? "border-primary/40 text-primary" :
                    r.status === "rejected" ? "border-destructive/40 text-destructive" :
                    r.status === "cancelled" ? "text-hero-foreground/40" :
                    "border-yellow-500/40 text-yellow-500"
                  }>{r.status}</Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><p className="text-[11px] uppercase text-hero-foreground/50">Sparks</p>
                    <p className="font-bold text-primary">{r.sparks_amount + (r.bonus_sparks || 0)}{r.bonus_sparks ? <span className="ml-1 text-[10px] text-hero-foreground/50">(+{r.bonus_sparks} bonus)</span> : null}</p>
                  </div>
                  <div><p className="text-[11px] uppercase text-hero-foreground/50">Price</p>
                    <p className="font-bold text-hero-foreground">{r.price_amount} {r.currency}</p></div>
                  <div><p className="text-[11px] uppercase text-hero-foreground/50">Method</p>
                    <p className="font-bold uppercase text-hero-foreground/80">{r.payment_method}</p></div>
                  <div><p className="text-[11px] uppercase text-hero-foreground/50">Ref / Txn</p>
                    <p className="truncate font-mono text-xs text-hero-foreground/80">{r.reference || "—"}</p></div>
                </div>

                {r.admin_note && <p className="mt-2 rounded-lg bg-hero-foreground/[0.04] p-2 text-xs text-hero-foreground/70">{r.admin_note}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openProof(r.proof_url)}>
                    <ImageIcon className="mr-1 h-3 w-3" /> View proof
                  </Button>
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" variant={active ? "default" : "outline"} onClick={() => { setNoteFor(active ? null : r.id); setNote(r.admin_note || ""); }}>
                        Add note
                      </Button>
                      <div className="ml-auto flex gap-2">
                        <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={() => reject(r.id)}>
                          <XCircle className="mr-1 h-3 w-3" /> Reject
                        </Button>
                        <Button size="sm" onClick={() => approve(r.id)}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {active && (
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Admin note (optional)" rows={2} className="mt-2 text-xs" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

/* ---------------- Manual Sparks (by user) ---------------- */
const ManualSparksPanel = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ user_id: string; full_name: string } | null>(null);
  const [amount, setAmount] = useState("100");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["admin_users_search", search],
    queryFn: async () => {
      const q = sb.from("profiles").select("user_id, full_name, phone").limit(15);
      const { data } = search.trim() ? await q.ilike("full_name", `%${search.trim()}%`) : await q.order("full_name");
      return (data || []) as { user_id: string; full_name: string; phone: string | null }[];
    },
    staleTime: 30_000,
  });

  const { data: bal } = useQuery({
    queryKey: ["admin_user_wallet", selected?.user_id],
    queryFn: async () => {
      const { data } = await sb.from("sparks_wallets").select("balance").eq("owner_user_id", selected!.user_id).maybeSingle();
      return (data?.balance ?? 0) as number;
    },
    enabled: !!selected?.user_id,
  });

  const run = async (sign: 1 | -1) => {
    if (!selected) return toast.error("Pick a user");
    const amt = Math.abs(parseInt(amount, 10) || 0);
    if (!amt) return toast.error("Enter amount");
    setBusy(true);
    try {
      if (sign > 0) await adminCreditSparks(selected.user_id, amt, "admin_added", notes || undefined);
      else await adminDebitSparks(selected.user_id, amt, "deduction", notes || undefined);
      toast.success(`${sign > 0 ? "Credited" : "Debited"} ${amt} Sparks`);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["admin_user_wallet", selected.user_id] });
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <section>
      <SectionHeader title="Manual Sparks Adjustment" subtitle="Credit or debit any user's wallet directly." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-hero-foreground/50" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user by name" className="pl-8" />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-hero-foreground/10">
            {users.length === 0 ? <p className="p-3 text-xs text-hero-foreground/50">No users.</p> : users.map((u) => (
              <button key={u.user_id} onClick={() => setSelected({ user_id: u.user_id, full_name: u.full_name })}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-hero-foreground/10 ${
                  selected?.user_id === u.user_id ? "bg-primary/15 text-primary" : "text-hero-foreground/80"
                }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{u.full_name || "Unknown"}</span>
                  {u.phone && <span className="text-[11px] text-hero-foreground/40">{u.phone}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          {selected ? (
            <>
              <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-bold">{selected.full_name} • {bal ?? 0} Sparks</p>
              </div>
              <div><Label>Amount</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" /></div>
              <div><Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-1" disabled={busy} onClick={() => run(1)}><Plus className="h-3.5 w-3.5" /> Credit</Button>
                <Button variant="outline" className="flex-1 gap-1" disabled={busy} onClick={() => run(-1)}><Minus className="h-3.5 w-3.5" /> Debit</Button>
              </div>
            </>
          ) : <p className="text-sm text-hero-foreground/50">Select a user to manage their balance.</p>}
        </div>
      </div>
    </section>
  );
};

/* ---------------- Packages ---------------- */
const PackagesPanel = () => {
  const qc = useQueryClient();
  const { data: pkgs = [], isLoading } = useQuery({ queryKey: ["admin_packages"], queryFn: adminFetchAllPackages });
  const [editing, setEditing] = useState<Partial<SparksPackage> | null>(null);

  const save = async () => {
    if (!editing?.name || !editing.sparks) return toast.error("Name & sparks required");
    try {
      await adminUpsertPackage({
        ...editing,
        sparks: Number(editing.sparks),
        bonus_sparks: Number(editing.bonus_sparks || 0),
        price_pkr: Number(editing.price_pkr || 0),
        price_usdt: Number(editing.price_usdt || 0),
        sort_order: Number(editing.sort_order || 0),
        is_active: editing.is_active ?? true,
      });
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin_packages"] });
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    try { await adminDeletePackage(id); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin_packages"] }); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <SectionHeader title="Sparks Packages" subtitle="Define what users can buy." />
        <Button size="sm" onClick={() => setEditing({ name: "", sparks: 100, price_pkr: 500, price_usdt: 2, bonus_sparks: 0, sort_order: pkgs.length, is_active: true })}>
          <Plus className="mr-1 h-3 w-3" /> New
        </Button>
      </div>

      {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pkgs.map((p) => (
            <div key={p.id} className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-hero-foreground">{p.name}</p>
                  <p className="text-sm text-primary">{p.sparks} Sparks {p.bonus_sparks > 0 && <span className="text-[11px] text-hero-foreground/60">+{p.bonus_sparks} bonus</span>}</p>
                  <p className="mt-1 text-xs text-hero-foreground/70">PKR {p.price_pkr} • USDT {p.price_usdt}</p>
                </div>
                <Badge variant="outline" className={p.is_active ? "border-primary/40 text-primary" : "text-hero-foreground/40"}>{p.is_active ? "Active" : "Hidden"}</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={() => remove(p.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <p className="mb-3 font-bold text-hero-foreground">{editing.id ? "Edit package" : "New package"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Name</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Sparks</Label><Input type="number" value={editing.sparks ?? ""} onChange={(e) => setEditing({ ...editing, sparks: Number(e.target.value) })} /></div>
            <div><Label>Bonus Sparks</Label><Input type="number" value={editing.bonus_sparks ?? 0} onChange={(e) => setEditing({ ...editing, bonus_sparks: Number(e.target.value) })} /></div>
            <div><Label>Sort order</Label><Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
            <div><Label>Price PKR</Label><Input type="number" step="0.01" value={editing.price_pkr ?? 0} onChange={(e) => setEditing({ ...editing, price_pkr: Number(e.target.value) })} /></div>
            <div><Label>Price USDT</Label><Input type="number" step="0.01" value={editing.price_usdt ?? 0} onChange={(e) => setEditing({ ...editing, price_usdt: Number(e.target.value) })} /></div>
            <label className="flex items-center gap-2 text-sm text-hero-foreground/80">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              Active
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={save}><Save className="mr-1 h-3 w-3" /> Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
};

/* ---------------- Payment Settings ---------------- */
const PaymentSettingsPanel = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["payment_settings_admin"], queryFn: fetchPaymentSettings });
  const [form, setForm] = useState<Partial<PaymentSettings>>({});
  const merged: Partial<PaymentSettings> = { ...(data || {}), ...form };

  const save = async () => {
    try { await adminUpdatePaymentSettings(form); toast.success("Saved"); setForm({}); qc.invalidateQueries({ queryKey: ["payment_settings_admin"] }); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
  };

  if (isLoading) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />;

  const fld = (k: keyof PaymentSettings, label: string, placeholder?: string) => (
    <div><Label>{label}</Label>
      <Input value={(merged as any)[k] || ""} placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
  );

  return (
    <section>
      <SectionHeader title="Payment Settings" subtitle="Manage Easypaisa / JazzCash / USDT details users see at checkout." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <p className="text-sm font-bold text-hero-foreground">Easypaisa</p>
          {fld("easypaisa_number", "Number", "03xx-xxxxxxx")}
          {fld("easypaisa_account_name", "Account name")}
          {fld("easypaisa_qr_url", "QR image URL")}
        </div>
        <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <p className="text-sm font-bold text-hero-foreground">JazzCash</p>
          {fld("jazzcash_number", "Number", "03xx-xxxxxxx")}
          {fld("jazzcash_account_name", "Account name")}
          {fld("jazzcash_qr_url", "QR image URL")}
        </div>
        <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <p className="text-sm font-bold text-hero-foreground">USDT</p>
          {fld("usdt_address", "Wallet address")}
          {fld("usdt_network", "Network", "TRC20")}
          {fld("usdt_qr_url", "QR image URL")}
        </div>
      </div>
      <div className="mt-4 space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
        <Label>Checkout instructions</Label>
        <Textarea value={merged.instructions || ""} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={3} />
      </div>
      <div className="mt-4">
        <Button onClick={save} disabled={!Object.keys(form).length}><Save className="mr-1 h-3 w-3" /> Save</Button>
      </div>
    </section>
  );
};

/* ---------------- Campaigns (existing) ---------------- */
const CampaignsPanel = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | AdminCampaign["status"]>("all");
  const [placementFilter, setPlacementFilter] = useState<"all" | "homepage" | "explore">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "local" | "international">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["admin_campaigns", statusFilter],
    queryFn: async () => {
      let q = sb.from("ad_campaigns")
        .select("id, worker_id, owner_user_id, ad_type, status, placement_type, starts_at, ends_at, duration_days, sparks_cost, created_at")
        .order("created_at", { ascending: false }).limit(300);
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
      if (!ownerIds.length) return {} as Record<string, any>;
      const { data } = await sb.from("profiles").select("user_id, full_name, phone").in("user_id", ownerIds);
      const m: Record<string, any> = {};
      (data || []).forEach((r: any) => (m[r.user_id] = { name: r.full_name || "Unknown", phone: r.phone }));
      return m;
    },
    enabled: ownerIds.length > 0,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (placementFilter !== "all" && c.placement_type !== placementFilter) return false;
      if (typeFilter !== "all" && c.ad_type !== typeFilter) return false;
      if (!q) return true;
      const p = (profilesMap as any)[c.owner_user_id];
      return (
        (p?.name || "").toLowerCase().includes(q) ||
        (p?.phone || "").toLowerCase().includes(q) ||
        c.owner_user_id.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
  }, [campaigns, profilesMap, query, placementFilter, typeFilter]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) filtered.forEach((c) => next.delete(c.id));
    else filtered.forEach((c) => next.add(c.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const clearSelection = () => setSelected(new Set());

  const setStatus = async (id: string, status: "active" | "paused") => {
    const { error } = await sb.rpc("set_campaign_status", { _campaign_id: id, _status: status });
    if (error) return toast.error(error.message);
    toast.success(`Campaign ${status}`);
    qc.invalidateQueries({ queryKey: ["admin_campaigns"] });
  };
  const expireNow = async () => {
    const { error } = await sb.rpc("expire_campaigns");
    if (error) return toast.error(error.message);
    toast.success("Expired due campaigns");
    qc.invalidateQueries({ queryKey: ["admin_campaigns"] });
  };

  const bulkSetStatus = async (status: "active" | "paused") => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkBusy(true);
    const results = await Promise.allSettled(
      ids.map((id) => sb.rpc("set_campaign_status", { _campaign_id: id, _status: status }))
    );
    const failed = results.filter((r) => r.status === "rejected" || (r as any).value?.error).length;
    setBulkBusy(false);
    if (failed) toast.error(`${ids.length - failed}/${ids.length} updated, ${failed} failed`);
    else toast.success(`${ids.length} campaign(s) ${status}`);
    clearSelection();
    qc.invalidateQueries({ queryKey: ["admin_campaigns"] });
  };
  const bulkExpire = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkBusy(true);
    const { error } = await sb.from("ad_campaigns").update({ status: "expired", ends_at: new Date().toISOString() }).in("id", ids);
    setBulkBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} campaign(s) expired`);
    clearSelection();
    qc.invalidateQueries({ queryKey: ["admin_campaigns"] });
  };

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3 flex-wrap">
        <SectionHeader title="Ad Campaigns" subtitle="Search, filter, and bulk-manage running ads." />
        <Button variant="outline" size="sm" onClick={expireNow}>Expire due</Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hero-foreground/40" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search owner, phone or id…" className="pl-9 h-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "active", "paused", "expired", "rejected"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s as any)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${
                statusFilter === s ? "bg-primary text-primary-foreground ring-primary"
                                   : "ring-hero-foreground/15 text-hero-foreground/70 hover:bg-hero-foreground/10"
              }`}>{s}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "homepage", "explore"] as const).map((s) => (
            <button key={s} onClick={() => setPlacementFilter(s)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${
                placementFilter === s ? "bg-hero-foreground text-hero ring-hero-foreground"
                                      : "ring-hero-foreground/15 text-hero-foreground/70 hover:bg-hero-foreground/10"
              }`}>{s}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "local", "international"] as const).map((s) => (
            <button key={s} onClick={() => setTypeFilter(s)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${
                typeFilter === s ? "bg-hero-foreground text-hero ring-hero-foreground"
                                 : "ring-hero-foreground/15 text-hero-foreground/70 hover:bg-hero-foreground/10"
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2">
          <span className="text-xs font-bold text-hero-foreground">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkSetStatus("paused")}><Pause className="mr-1 h-3 w-3" /> Pause</Button>
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkSetStatus("active")}><Play className="mr-1 h-3 w-3" /> Resume</Button>
            <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={bulkExpire}>Expire</Button>
            <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={clearSelection}>Clear</Button>
          </div>
        </div>
      )}

      {isLoading ? <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        : filtered.length === 0 ? <p className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-6 text-center text-sm text-hero-foreground/60">No campaigns match.</p>
        : (
          <div className="overflow-hidden rounded-2xl border border-hero-foreground/10">
            <table className="w-full text-sm">
              <thead className="bg-hero-foreground/[0.04] text-[11px] uppercase tracking-wider text-hero-foreground/60">
                <tr>
                  <th className="px-3 py-2 w-8"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></th>
                  <th className="px-3 py-2 text-left">Owner</th>
                  <th className="px-3 py-2 text-left">Placement</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Window</th>
                  <th className="px-3 py-2 text-right">Sparks</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const p = (profilesMap as any)[c.owner_user_id];
                  const checked = selected.has(c.id);
                  return (
                    <tr key={c.id} className={`border-t border-hero-foreground/5 hover:bg-hero-foreground/[0.03] ${checked ? "bg-primary/5" : ""}`}>
                      <td className="px-3 py-2"><input type="checkbox" checked={checked} onChange={() => toggleOne(c.id)} aria-label="Select row" /></td>
                      <td className="px-3 py-2"><p className="font-semibold text-hero-foreground">{p?.name || "—"}</p>{p?.phone && <p className="text-[11px] text-hero-foreground/50">{p.phone}</p>}</td>
                      <td className="px-3 py-2"><span className="text-[11px] font-bold uppercase tracking-wider text-hero-foreground/80">{c.placement_type}</span></td>
                      <td className="px-3 py-2"><span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-hero-foreground/80">{c.ad_type === "local" ? <MapPin className="h-3 w-3" /> : <Globe className="h-3 w-3" />}{c.ad_type}</span></td>
                      <td className="px-3 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${statusStyles[c.status]}`}>{c.status}</span></td>
                      <td className="px-3 py-2 text-[11px] text-hero-foreground/70">{new Date(c.starts_at).toLocaleDateString()} → {new Date(c.ends_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-hero-foreground">{c.sparks_cost}</td>
                      <td className="px-3 py-2 text-right">
                        {c.status === "active" && <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "paused")}><Pause className="mr-1 h-3 w-3" /> Pause</Button>}
                        {c.status === "paused" && <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "active")}><Play className="mr-1 h-3 w-3" /> Resume</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
};

/* ---------------- All transactions ---------------- */
const TransactionsPanel = () => {
  const { data: tx = [], isLoading } = useQuery({
    queryKey: ["admin_all_tx"],
    queryFn: async () => {
      const { data, error } = await sb.from("sparks_transactions")
        .select("id, owner_user_id, delta, reason, notes, status, payment_method, created_at")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 20_000,
  });
  const uids = useMemo(() => Array.from(new Set((tx as any[]).map((t) => t.owner_user_id))), [tx]);
  const { data: profiles = {} } = useQuery({
    queryKey: ["admin_tx_profiles", uids.sort().join(",")],
    queryFn: async () => {
      if (!uids.length) return {};
      const { data } = await sb.from("profiles").select("user_id, full_name").in("user_id", uids);
      const m: Record<string, string> = {};
      (data || []).forEach((r: any) => (m[r.user_id] = r.full_name || "Unknown"));
      return m;
    },
    enabled: uids.length > 0,
  });

  return (
    <section>
      <SectionHeader title="All Transactions" subtitle="Latest 200 wallet movements." />
      {isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /> : (
        <div className="overflow-hidden rounded-2xl border border-hero-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-hero-foreground/[0.04] text-[11px] uppercase tracking-wider text-hero-foreground/60">
              <tr><th className="px-3 py-2 text-left">When</th><th className="px-3 py-2 text-left">User</th><th className="px-3 py-2 text-left">Reason</th><th className="px-3 py-2 text-right">Δ</th></tr>
            </thead>
            <tbody>
              {(tx as any[]).map((t) => (
                <tr key={t.id} className="border-t border-hero-foreground/5">
                  <td className="px-3 py-2 text-[11px] text-hero-foreground/60">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 text-hero-foreground/80">{(profiles as any)[t.owner_user_id] || t.owner_user_id.slice(0, 8)}</td>
                  <td className="px-3 py-2"><span className="text-xs text-hero-foreground/70">{t.reason}{t.notes && <span className="ml-1 text-hero-foreground/40">— {t.notes}</span>}</span></td>
                  <td className={`px-3 py-2 text-right font-bold tabular-nums ${t.delta > 0 ? "text-primary" : "text-destructive"}`}>{t.delta > 0 ? "+" : ""}{t.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

/* ---------------- Root ---------------- */
const SparksAdminTab = () => (
  <Tabs defaultValue="payments" className="space-y-6">
    <TabsList className="flex w-full flex-wrap gap-1 bg-hero-foreground/[0.04]">
      <TabsTrigger value="payments" className="gap-1"><Receipt className="h-3.5 w-3.5" /> Payments</TabsTrigger>
      <TabsTrigger value="manual" className="gap-1"><Wallet className="h-3.5 w-3.5" /> Manual</TabsTrigger>
      <TabsTrigger value="packages" className="gap-1"><Package className="h-3.5 w-3.5" /> Packages</TabsTrigger>
      <TabsTrigger value="settings" className="gap-1"><Settings2 className="h-3.5 w-3.5" /> Settings</TabsTrigger>
      <TabsTrigger value="campaigns" className="gap-1"><Sparkles className="h-3.5 w-3.5" /> Campaigns</TabsTrigger>
      <TabsTrigger value="tx" className="gap-1"><Receipt className="h-3.5 w-3.5" /> Tx</TabsTrigger>
    </TabsList>
    <TabsContent value="payments"><PendingPaymentsPanel /></TabsContent>
    <TabsContent value="manual"><ManualSparksPanel /></TabsContent>
    <TabsContent value="packages"><PackagesPanel /></TabsContent>
    <TabsContent value="settings"><PaymentSettingsPanel /></TabsContent>
    <TabsContent value="campaigns"><CampaignsPanel /></TabsContent>
    <TabsContent value="tx"><TransactionsPanel /></TabsContent>
  </Tabs>
);

export default SparksAdminTab;
export { CampaignsPanel };
