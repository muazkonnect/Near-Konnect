import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, TrendingUp, Wallet, Receipt, Clock } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, subDays, subMonths, endOfMonth } from "date-fns";
import { toast } from "sonner";

const sb = supabase as any;

type Period = "daily" | "weekly" | "monthly" | "custom";

type PaymentRow = {
  id: string;
  user_id: string;
  sparks_amount: number;
  bonus_sparks: number;
  price_amount: number;
  currency: string;
  payment_method: string;
  reference: string;
  status: string;
  admin_note: string;
  created_at: string;
  decided_at: string | null;
  invoice_number: number | null;
  invoiced_at: string | null;
};

const formatInvoiceNo = (n: number | null | undefined, fallbackId: string) =>
  n ? `INV-${String(n).padStart(6, "0")}` : `DRAFT-${fallbackId.slice(0, 6).toUpperCase()}`;

type SparksTx = {
  id: string;
  owner_user_id: string;
  delta: number;
  reason: string;
  notes: string | null;
  status: string;
  created_at: string;
};

function rangeFor(period: Period, from?: string, to?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (period === "daily") return { start: startOfDay(now), end: now, label: format(now, "PP") };
  if (period === "weekly") return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now, label: `Week of ${format(startOfWeek(now, { weekStartsOn: 1 }), "PP")}` };
  if (period === "monthly") return { start: startOfMonth(now), end: now, label: format(now, "MMMM yyyy") };
  return {
    start: from ? new Date(from) : subDays(now, 30),
    end: to ? new Date(to) : now,
    label: `${from || "—"} → ${to || "—"}`,
  };
}

function csvEscape(v: any): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadFile(name: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

const FinanceTab = () => {
  const [period, setPeriod] = useState<Period>("monthly");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [feePct, setFeePct] = useState<number>(() => {
    const v = Number(localStorage.getItem("finance_fee_pct"));
    return Number.isFinite(v) && v >= 0 ? v : 2.5;
  });
  const [fixedFee, setFixedFee] = useState<number>(() => {
    const v = Number(localStorage.getItem("finance_fixed_fee"));
    return Number.isFinite(v) && v >= 0 ? v : 0;
  });

  const range = useMemo(() => rangeFor(period, from, to), [period, from, to]);
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();

  const { data: payments = [], isLoading: pLoading } = useQuery({
    queryKey: ["admin_payments", startIso, endIso],
    queryFn: async () => {
      const { data, error } = await sb
        .from("payment_requests")
        .select("*")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PaymentRow[];
    },
  });

  const { data: spends = [] } = useQuery({
    queryKey: ["admin_sparks_tx", startIso, endIso],
    queryFn: async () => {
      const { data, error } = await sb
        .from("sparks_transactions")
        .select("id, owner_user_id, delta, reason, notes, status, created_at")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as SparksTx[];
    },
  });

  // Monthly history (last 12 months)
  const { data: history = [] } = useQuery({
    queryKey: ["admin_finance_history"],
    queryFn: async () => {
      const start = subMonths(startOfMonth(new Date()), 11).toISOString();
      const { data, error } = await sb
        .from("payment_requests")
        .select("price_amount, currency, status, created_at, sparks_amount, bonus_sparks")
        .gte("created_at", start)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PaymentRow[];
    },
  });

  const userIds = useMemo(() => {
    const s = new Set<string>();
    payments.forEach((p) => s.add(p.user_id));
    spends.forEach((t) => s.add(t.owner_user_id));
    return Array.from(s);
  }, [payments, spends]);

  const { data: profileMap = {} } = useQuery({
    queryKey: ["admin_finance_profiles", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await sb.from("profiles").select("user_id, full_name, phone").in("user_id", userIds);
      if (error) throw error;
      const map: Record<string, { full_name: string; phone: string | null }> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = { full_name: p.full_name, phone: p.phone }; });
      return map;
    },
  });

  const stats = useMemo(() => {
    const byCurrency: Record<string, { revenue: number; count: number; sparks: number }> = {};
    let approved = 0, pending = 0, rejected = 0, sparksSold = 0, bonusGranted = 0, pendingRevenueByCurrency: Record<string, number> = {};
    payments.forEach((p) => {
      if (p.status === "approved") {
        approved++;
        const c = byCurrency[p.currency] || (byCurrency[p.currency] = { revenue: 0, count: 0, sparks: 0 });
        c.revenue += Number(p.price_amount); c.count++; c.sparks += p.sparks_amount + (p.bonus_sparks || 0);
        sparksSold += p.sparks_amount;
        bonusGranted += p.bonus_sparks || 0;
      } else if (p.status === "pending") {
        pending++;
        pendingRevenueByCurrency[p.currency] = (pendingRevenueByCurrency[p.currency] || 0) + Number(p.price_amount);
      } else if (p.status === "rejected") rejected++;
    });
    const sparksSpent = spends.filter((t) => t.delta < 0).reduce((a, t) => a + Math.abs(t.delta), 0);
    const sparksCredited = spends.filter((t) => t.delta > 0 && t.status === "completed").reduce((a, t) => a + t.delta, 0);
    return { byCurrency, approved, pending, rejected, sparksSold, bonusGranted, sparksSpent, sparksCredited, pendingRevenueByCurrency, total: payments.length };
  }, [payments, spends]);

  const profit = useMemo(() => {
    const rows: { currency: string; revenue: number; count: number; sparks: number; fees: number; net: number }[] = [];
    Object.entries(stats.byCurrency).forEach(([currency, v]) => {
      const fees = (v.revenue * feePct) / 100 + fixedFee * v.count;
      rows.push({ currency, revenue: v.revenue, count: v.count, sparks: v.sparks, fees, net: v.revenue - fees });
    });
    rows.sort((a, b) => b.revenue - a.revenue);
    return rows;
  }, [stats.byCurrency, feePct, fixedFee]);

  const monthlyHistory = useMemo(() => {
    const map: Record<string, { month: string; approved: number; pending: number; rejected: number; revenue: Record<string, number>; sparks: number }> = {};
    history.forEach((p) => {
      const key = format(new Date(p.created_at), "yyyy-MM");
      if (!map[key]) map[key] = { month: key, approved: 0, pending: 0, rejected: 0, revenue: {}, sparks: 0 };
      const m = map[key];
      if (p.status === "approved") {
        m.approved++;
        m.revenue[p.currency] = (m.revenue[p.currency] || 0) + Number(p.price_amount);
        m.sparks += p.sparks_amount + (p.bonus_sparks || 0);
      } else if (p.status === "pending") m.pending++;
      else if (p.status === "rejected") m.rejected++;
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [history]);

  const exportPaymentsCsv = () => {
    const headers = ["invoice_no", "id", "date", "user_name", "user_phone", "method", "reference", "currency", "amount", "sparks", "bonus_sparks", "status", "decided_at"];
    const rows = payments.map((p) => [
      formatInvoiceNo(p.invoice_number, p.id),
      p.id,
      format(new Date(p.created_at), "yyyy-MM-dd HH:mm"),
      profileMap[p.user_id]?.full_name || p.user_id,
      profileMap[p.user_id]?.phone || "",
      p.payment_method,
      p.reference,
      p.currency,
      p.price_amount,
      p.sparks_amount,
      p.bonus_sparks,
      p.status,
      p.decided_at ? format(new Date(p.decided_at), "yyyy-MM-dd HH:mm") : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    downloadFile(`payments_${period}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`, csv);
    toast.success("CSV downloaded");
  };

  const exportSpendsCsv = () => {
    const headers = ["id", "date", "user_name", "delta", "reason", "status", "notes"];
    const rows = spends.map((t) => [
      t.id,
      format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
      profileMap[t.owner_user_id]?.full_name || t.owner_user_id,
      t.delta,
      t.reason,
      t.status,
      t.notes || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    downloadFile(`sparks_tx_${period}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`, csv);
    toast.success("CSV downloaded");
  };

  const printInvoice = (p: PaymentRow) => {
    const user = profileMap[p.user_id];
    const invoiceNo = formatInvoiceNo(p.invoice_number, p.id);
    const issued = p.invoiced_at || p.decided_at || p.created_at;
    const statusClass = p.status === "approved" ? "ok" : p.status === "pending" ? "pend" : "rej";
    const subtotal = Number(p.price_amount);
    const w = window.open("", "_blank", "width=820,height=920");
    if (!w) return toast.error("Popup blocked");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${invoiceNo} — Near Konnect</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;color:#0f172a;padding:48px;max-width:800px;margin:auto;background:#fff}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:18px}
  .brand h1{margin:0;font-size:24px;letter-spacing:-0.5px}
  .brand .tag{color:#64748b;font-size:12px;margin-top:2px;text-transform:uppercase;letter-spacing:1.5px}
  .meta{text-align:right}
  .meta .label{color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px}
  .meta .num{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:700;margin-top:2px}
  .meta .date{color:#64748b;font-size:12px;margin-top:6px}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:28px}
  .party{padding:14px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
  .party .l{color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
  .party .v{font-weight:600;font-size:14px}
  .party .s{color:#64748b;font-size:12px;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-top:28px;font-size:13px}
  thead th{text-align:left;padding:10px 12px;background:#0f172a;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:1px}
  thead th.right{text-align:right}
  tbody td{padding:14px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  tbody td.right{text-align:right;font-variant-numeric:tabular-nums}
  .muted{color:#64748b;font-size:12px}
  .totals{margin-top:18px;margin-left:auto;width:280px}
  .totals .line{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
  .totals .grand{border-top:2px solid #0f172a;margin-top:8px;padding-top:10px;font-size:16px;font-weight:700}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
  .ok{background:#dcfce7;color:#166534}.pend{background:#fef3c7;color:#92400e}.rej{background:#fee2e2;color:#991b1b}
  .note{margin-top:24px;padding:12px 14px;background:#fefce8;border-left:3px solid #facc15;font-size:12px;color:#713f12}
  .footer{margin-top:48px;padding-top:18px;border-top:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:11px;line-height:1.6}
  .actions{margin-top:28px;text-align:center}
  .actions button{padding:10px 24px;background:#0f172a;color:#fff;border:0;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600}
  @media print{.actions{display:none}body{padding:24px}}
</style></head><body>
<div class="head">
  <div class="brand"><h1>Near Konnect</h1><div class="tag">Sparks Purchase Invoice</div></div>
  <div class="meta">
    <div class="label">Invoice</div><div class="num">${invoiceNo}</div>
    <div class="date">Issued ${format(new Date(issued), "PP")}</div>
    <div class="date">Status <span class="badge ${statusClass}">${p.status}</span></div>
  </div>
</div>
<div class="parties">
  <div class="party"><div class="l">Billed To</div><div class="v">${user?.full_name || "—"}</div><div class="s">${user?.phone || ""}</div></div>
  <div class="party"><div class="l">Payment</div><div class="v">${p.payment_method.toUpperCase()}</div><div class="s">Ref: ${p.reference || "—"}</div></div>
</div>
<table>
  <thead><tr><th>Description</th><th class="right">Sparks</th><th class="right">Unit</th><th class="right">Amount</th></tr></thead>
  <tbody>
    <tr>
      <td><div style="font-weight:600">Sparks credit purchase</div><div class="muted">Account top-up${p.bonus_sparks ? ` · includes ${p.bonus_sparks} bonus sparks` : ""}</div></td>
      <td class="right">${p.sparks_amount.toLocaleString()}${p.bonus_sparks ? `<div class="muted">+${p.bonus_sparks}</div>` : ""}</td>
      <td class="right muted">${p.currency}</td>
      <td class="right">${subtotal.toLocaleString()}</td>
    </tr>
  </tbody>
</table>
<div class="totals">
  <div class="line"><span class="muted">Subtotal</span><span>${p.currency} ${subtotal.toLocaleString()}</span></div>
  <div class="line"><span class="muted">Tax</span><span>${p.currency} 0</span></div>
  <div class="line grand"><span>Total</span><span>${p.currency} ${subtotal.toLocaleString()}</span></div>
</div>
${p.admin_note ? `<div class="note"><b>Note:</b> ${p.admin_note}</div>` : ""}
<div class="footer">
  Thank you for choosing Near Konnect.<br>
  Invoice ${invoiceNo} · Generated ${format(new Date(), "PPpp")}<br>
  This document was generated electronically and is valid without signature.
</div>
<div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
</body></html>`;
    w.document.write(html);
    w.document.close();
  };

  const printPeriodReport = () => {
    const w = window.open("", "_blank", "width=900,height=900");
    if (!w) return toast.error("Popup blocked");
    const revRows = profit.map((r) => `<tr><td>${r.currency}</td><td class="right">${r.revenue.toLocaleString()}</td><td class="right">-${r.fees.toLocaleString(undefined,{maximumFractionDigits:2})}</td><td class="right"><b>${r.net.toLocaleString(undefined,{maximumFractionDigits:2})}</b></td></tr>`).join("");
    const txRows = payments.slice(0, 200).map((p) => `<tr>
      <td>${format(new Date(p.created_at), "MMM d, HH:mm")}</td>
      <td>${profileMap[p.user_id]?.full_name || p.user_id.slice(0, 8)}</td>
      <td>${p.payment_method}</td>
      <td class="right">${p.sparks_amount}</td>
      <td class="right">${p.currency} ${Number(p.price_amount).toLocaleString()}</td>
      <td>${p.status}</td>
    </tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Finance Report ${range.label}</title>
<style>body{font-family:-apple-system,sans-serif;padding:40px;max-width:900px;margin:auto;color:#0f172a}
h1{margin:0}h2{margin-top:30px;font-size:16px;color:#475569}
table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0}.right{text-align:right}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}
.stat{background:#f8fafc;padding:14px;border-radius:10px}.stat .v{font-size:22px;font-weight:700}.stat .l{font-size:11px;color:#64748b;text-transform:uppercase}
@media print{button{display:none}}
</style></head><body>
<div style="display:flex;justify-content:space-between"><div><h1>Finance Report</h1><div style="color:#64748b">${range.label}</div></div>
<div style="text-align:right;color:#64748b">Generated ${format(new Date(), "PPpp")}</div></div>
<div class="grid">
  <div class="stat"><div class="l">Approved</div><div class="v">${stats.approved}</div></div>
  <div class="stat"><div class="l">Pending</div><div class="v">${stats.pending}</div></div>
  <div class="stat"><div class="l">Rejected</div><div class="v">${stats.rejected}</div></div>
  <div class="stat"><div class="l">Sparks Sold</div><div class="v">${stats.sparksSold.toLocaleString()}</div></div>
</div>
<h2>Profit by Currency (fees: ${feePct}% + ${fixedFee} fixed/tx)</h2>
<table><thead><tr><th>Currency</th><th class="right">Revenue</th><th class="right">Fees</th><th class="right">Net Profit</th></tr></thead><tbody>${revRows || '<tr><td colspan="4">No approved revenue</td></tr>'}</tbody></table>
<h2>Transactions (${payments.length})</h2>
<table><thead><tr><th>Date</th><th>User</th><th>Method</th><th class="right">Sparks</th><th class="right">Amount</th><th>Status</th></tr></thead><tbody>${txRows}</tbody></table>
<div style="margin-top:30px;text-align:center"><button onclick="window.print()" style="padding:10px 20px;background:#0f172a;color:#fff;border:0;border-radius:8px;cursor:pointer">Print / Save as PDF</button></div>
</body></html>`;
    w.document.write(html); w.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" /> Finance & Invoices</h2>
          <p className="text-sm text-hero-foreground/60">Track revenue, generate invoices, and download transaction reports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={printPeriodReport}><FileText className="h-4 w-4 mr-1" />Period Report</Button>
          <Button variant="outline" size="sm" onClick={exportPaymentsCsv}><Download className="h-4 w-4 mr-1" />Payments CSV</Button>
          <Button variant="outline" size="sm" onClick={exportSpendsCsv}><Download className="h-4 w-4 mr-1" />Spends CSV</Button>
        </div>
      </div>

      <Card className="p-4 bg-hero-foreground/[0.03] border-hero-foreground/10">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="daily">Today</TabsTrigger>
            <TabsTrigger value="weekly">This Week</TabsTrigger>
            <TabsTrigger value="monthly">This Month</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
          <TabsContent value="custom" className="mt-3 flex flex-wrap gap-2 items-end">
            <div><label className="text-xs text-hero-foreground/60">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className="text-xs text-hero-foreground/60">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </TabsContent>
        </Tabs>
        <div className="mt-3 text-xs text-hero-foreground/60">Showing: <span className="text-hero-foreground font-medium">{range.label}</span></div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Approved" value={stats.approved} accent="emerald" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} accent="amber" />
        <StatCard icon={Wallet} label="Sparks Sold" value={stats.sparksSold.toLocaleString()} accent="primary" />
        <StatCard icon={Receipt} label="Sparks Spent" value={stats.sparksSpent.toLocaleString()} accent="rose" />
      </div>

      <Card className="p-4 bg-hero-foreground/[0.03] border-hero-foreground/10 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /> Profit & Loss — {range.label}</h3>
            <p className="text-xs text-hero-foreground/60">Approved revenue minus platform/processing fees, per currency.</p>
          </div>
          <div className="flex gap-2 items-end">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-hero-foreground/60">Fee %</label>
              <Input type="number" step="0.1" min="0" value={feePct} className="h-8 w-20"
                onChange={(e) => { const v = Number(e.target.value) || 0; setFeePct(v); localStorage.setItem("finance_fee_pct", String(v)); }} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-hero-foreground/60">Fixed/tx</label>
              <Input type="number" step="0.01" min="0" value={fixedFee} className="h-8 w-20"
                onChange={(e) => { const v = Number(e.target.value) || 0; setFixedFee(v); localStorage.setItem("finance_fixed_fee", String(v)); }} />
            </div>
          </div>
        </div>

        {profit.length === 0 ? (
          <div className="text-sm text-hero-foreground/60 py-4 text-center">No approved revenue in this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Txns</TableHead>
                  <TableHead className="text-right">Sparks Issued</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profit.map((r) => {
                  const margin = r.revenue > 0 ? (r.net / r.revenue) * 100 : 0;
                  return (
                    <TableRow key={r.currency}>
                      <TableCell className="font-semibold">{r.currency}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.sparks.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-rose-400">-{r.fees.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-emerald-400">{r.net.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right tabular-nums">{margin.toFixed(1)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-hero-foreground/10">
          <MiniStat label="Sparks Sold" value={stats.sparksSold.toLocaleString()} />
          <MiniStat label="Bonus Granted" value={stats.bonusGranted.toLocaleString()} />
          <MiniStat label="Sparks Spent" value={stats.sparksSpent.toLocaleString()} />
          <MiniStat label="Net Liability Δ" value={(stats.sparksSold + stats.bonusGranted - stats.sparksSpent).toLocaleString()}
            hint="Sparks issued minus sparks spent in period" />
        </div>

        {Object.keys(stats.pendingRevenueByCurrency).length > 0 && (
          <div className="text-xs text-amber-400/90 flex flex-wrap gap-2">
            <span className="text-hero-foreground/60">Pending (not counted):</span>
            {Object.entries(stats.pendingRevenueByCurrency).map(([c, a]) => (
              <span key={c} className="px-2 py-0.5 rounded bg-amber-500/10">{c} {a.toLocaleString()}</span>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-0 bg-hero-foreground/[0.03] border-hero-foreground/10 overflow-hidden">
        <div className="p-4 border-b border-hero-foreground/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Payment Transactions ({payments.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Method</TableHead>
                <TableHead>Reference</TableHead><TableHead className="text-right">Sparks</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-hero-foreground/60">Loading…</TableCell></TableRow>
              ) : payments.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-6 text-hero-foreground/60">No transactions in this period</TableCell></TableRow>
              ) : payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(p.created_at), "MMM d, HH:mm")}</TableCell>
                  <TableCell className="text-xs">{profileMap[p.user_id]?.full_name || p.user_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs uppercase">{p.payment_method}</TableCell>
                  <TableCell className="text-xs font-mono">{p.reference || "—"}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{p.sparks_amount}{p.bonus_sparks ? `+${p.bonus_sparks}` : ""}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums font-semibold">{p.currency} {Number(p.price_amount).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => printInvoice(p)}><FileText className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-0 bg-hero-foreground/[0.03] border-hero-foreground/10 overflow-hidden">
        <div className="p-4 border-b border-hero-foreground/10">
          <h3 className="text-sm font-semibold">Monthly History (last 12 months)</h3>
          <p className="text-xs text-hero-foreground/60">Complete record of revenue and transactions per month.</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead><TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Pending</TableHead><TableHead className="text-right">Rejected</TableHead>
                <TableHead className="text-right">Sparks</TableHead><TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyHistory.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-hero-foreground/60">No history yet</TableCell></TableRow>
              ) : monthlyHistory.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-medium">{format(new Date(m.month + "-01"), "MMMM yyyy")}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.approved}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.pending}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.rejected}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.sparks.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(m.revenue).length === 0 ? <span className="text-xs text-hero-foreground/40">—</span> :
                        Object.entries(m.revenue).map(([c, a]) => (
                          <Badge key={c} variant="secondary" className="text-xs">{c} {a.toLocaleString()}</Badge>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent: string }) => {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    primary: "bg-primary/10 text-primary",
    rose: "bg-rose-500/10 text-rose-400",
  };
  return (
    <Card className="p-4 bg-hero-foreground/[0.03] border-hero-foreground/10">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${colors[accent]}`}><Icon className="h-4 w-4" /></div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-hero-foreground/60 uppercase tracking-wide">{label}</div>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    approved: "bg-emerald-500/15 text-emerald-400",
    pending: "bg-amber-500/15 text-amber-400",
    rejected: "bg-rose-500/15 text-rose-400",
    cancelled: "bg-hero-foreground/10 text-hero-foreground/60",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${map[status] || "bg-hero-foreground/10"}`}>{status}</span>;
};

const MiniStat = ({ label, value, hint }: { label: string; value: any; hint?: string }) => (
  <div className="rounded-lg bg-hero-foreground/[0.04] border border-hero-foreground/10 p-3" title={hint}>
    <div className="text-[10px] uppercase tracking-wide text-hero-foreground/60">{label}</div>
    <div className="text-lg font-semibold tabular-nums mt-0.5">{value}</div>
  </div>
);

export default FinanceTab;
