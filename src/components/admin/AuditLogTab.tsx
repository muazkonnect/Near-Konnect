import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Search, ScrollText, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

function AuditPanel() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin_audit_log"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("admin_audit_log")
        .select("id, admin_user_id, action, target_type, target_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });

  const adminIds = useMemo(
    () => Array.from(new Set(rows.map((r: any) => r.admin_user_id))),
    [rows]
  );
  const { data: profiles = {} } = useQuery({
    queryKey: ["admin_audit_profiles", adminIds.sort().join(",")],
    queryFn: async () => {
      if (!adminIds.length) return {};
      const { data } = await sb
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", adminIds);
      const m: Record<string, string> = {};
      (data || []).forEach((p: any) => (m[p.user_id] = p.full_name || "Unknown"));
      return m;
    },
    enabled: adminIds.length > 0,
  });

  const actions = useMemo(
    () => Array.from(new Set(rows.map((r: any) => r.action as string))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r: any) => {
      if (actionFilter && r.action !== actionFilter) return false;
      if (!q) return true;
      const adminName = (profiles as any)[r.admin_user_id] || "";
      return (
        r.action.toLowerCase().includes(q) ||
        r.target_type.toLowerCase().includes(q) ||
        (r.target_id || "").toLowerCase().includes(q) ||
        adminName.toLowerCase().includes(q)
      );
    });
  }, [rows, profiles, search, actionFilter]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hero-foreground/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, target, admin…"
            className="pl-9 h-9"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-9 rounded-md border border-hero-foreground/15 bg-hero-foreground/[0.04] px-2 text-xs text-hero-foreground"
        >
          <option value="">All actions</option>
          {(actions as string[]).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-6 text-center text-sm text-hero-foreground/60">
          No audit entries.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-hero-foreground/10">
          <table className="w-full text-sm">
            <thead className="bg-hero-foreground/[0.04] text-[11px] uppercase tracking-wider text-hero-foreground/60">
              <tr>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-left">Admin</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Target</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-t border-hero-foreground/5 hover:bg-hero-foreground/[0.03]">
                  <td className="px-3 py-2 text-[11px] text-hero-foreground/60">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-hero-foreground/80">
                    {(profiles as any)[r.admin_user_id] || r.admin_user_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-[10px]">
                      {r.action}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-hero-foreground/70">
                    {r.target_type}
                    {r.target_id && (
                      <span className="text-hero-foreground/50">/{String(r.target_id).slice(0, 8)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RevealsPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "denied" | "all">("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin_contact_reveals"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("contact_reveals")
        .select("id, worker_user_id, client_user_id, status, request_message, created_at, decided_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 20_000,
  });

  const ids = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r: any) => {
      s.add(r.worker_user_id);
      s.add(r.client_user_id);
    });
    return Array.from(s);
  }, [rows]);

  const { data: profiles = {} } = useQuery({
    queryKey: ["admin_reveals_profiles", ids.sort().join(",")],
    queryFn: async () => {
      if (!ids.length) return {};
      const { data } = await sb
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const m: Record<string, string> = {};
      (data || []).forEach((p: any) => (m[p.user_id] = p.full_name || "Unknown"));
      return m;
    },
    enabled: ids.length > 0,
  });

  const filtered = filter === "all" ? rows : rows.filter((r: any) => r.status === filter);

  const remove = async (id: string) => {
    if (!confirm("Delete this contact reveal record?")) return;
    const { error } = await sb.from("contact_reveals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["admin_contact_reveals"] });
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(["pending", "approved", "denied", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${
              filter === s
                ? "bg-primary text-primary-foreground ring-primary"
                : "ring-hero-foreground/15 text-hero-foreground/70 hover:bg-hero-foreground/10"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-6 text-center text-sm text-hero-foreground/60">
          No reveal requests.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r: any) => (
            <div
              key={r.id}
              className="flex flex-col gap-2 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-3 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-hero-foreground">
                  <span className="font-bold">{(profiles as any)[r.client_user_id] || "Client"}</span>
                  <span className="text-hero-foreground/50"> → </span>
                  <span className="font-bold">{(profiles as any)[r.worker_user_id] || "Worker"}</span>
                </p>
                {r.request_message && (
                  <p className="line-clamp-2 text-xs text-hero-foreground/60">"{r.request_message}"</p>
                )}
                <p className="text-[11px] text-hero-foreground/50">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  r.status === "approved"
                    ? "border-primary/40 text-primary"
                    : r.status === "denied"
                    ? "border-destructive/40 text-destructive"
                    : "border-yellow-500/40 text-yellow-500"
                }
              >
                {r.status === "approved" ? (
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                ) : r.status === "denied" ? (
                  <XCircle className="mr-1 h-3 w-3" />
                ) : null}
                {r.status}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(r.id)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditLogTab() {
  return (
    <section>
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-hero-foreground">
          <ScrollText className="h-5 w-5 text-primary" /> Audit & Access
        </h2>
        <p className="text-sm text-hero-foreground/60">
          Admin action history and contact reveal requests.
        </p>
      </div>
      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList className="bg-hero-foreground/[0.04]">
          <TabsTrigger value="audit" className="gap-1">
            <ScrollText className="h-3.5 w-3.5" /> Audit Log
          </TabsTrigger>
          <TabsTrigger value="reveals" className="gap-1">
            <KeyRound className="h-3.5 w-3.5" /> Contact Reveals
          </TabsTrigger>
        </TabsList>
        <TabsContent value="audit">
          <AuditPanel />
        </TabsContent>
        <TabsContent value="reveals">
          <RevealsPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}
