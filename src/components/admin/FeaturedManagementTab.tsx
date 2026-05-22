import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, Search, Zap, Clock, XCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

const sb = supabase as any;

const FeaturedManagementTab = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"active" | "all">("active");

  const { data: featured = [], isLoading } = useQuery({
    queryKey: ["admin_featured_workers"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("featured_workers")
        .select("id, worker_id, user_id, category_id, duration_days, sparks_cost, starts_at, ends_at, status, radius_km, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30_000,
  });

  const workerIds = useMemo(() => Array.from(new Set(featured.map((f) => f.worker_id))), [featured]);
  const userIds = useMemo(() => Array.from(new Set(featured.map((f) => f.user_id))), [featured]);

  const { data: workers = {} } = useQuery({
    queryKey: ["admin_featured_workers_map", workerIds.sort().join(",")],
    queryFn: async () => {
      if (!workerIds.length) return {};
      const { data } = await sb.from("workers").select("id, profession, main_category").in("id", workerIds);
      const m: Record<string, any> = {};
      (data || []).forEach((w: any) => (m[w.id] = w));
      return m;
    },
    enabled: workerIds.length > 0,
  });

  const { data: profiles = {} } = useQuery({
    queryKey: ["admin_featured_profiles", userIds.sort().join(",")],
    queryFn: async () => {
      if (!userIds.length) return {};
      const { data } = await sb.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      const m: Record<string, any> = {};
      (data || []).forEach((p: any) => (m[p.user_id] = p));
      return m;
    },
    enabled: userIds.length > 0,
  });

  const now = Date.now();
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return featured.filter((f: any) => {
      const isActive = f.status === "active" && new Date(f.ends_at).getTime() > now;
      if (filter === "active" && !isActive) return false;
      if (!q) return true;
      const p = (profiles as any)[f.user_id];
      const w = (workers as any)[f.worker_id];
      return (
        (p?.full_name || "").toLowerCase().includes(q) ||
        (w?.profession || "").toLowerCase().includes(q) ||
        (w?.main_category || "").toLowerCase().includes(q)
      );
    });
  }, [featured, profiles, workers, search, filter, now]);

  const activeCount = featured.filter((f: any) => f.status === "active" && new Date(f.ends_at).getTime() > now).length;
  const totalSparks = featured.reduce((s: number, f: any) => s + (f.sparks_cost || 0), 0);

  const cancel = async (id: string) => {
    if (!confirm("Cancel this featured listing? It will end immediately (no refund).")) return;
    const { error } = await sb
      .from("featured_workers")
      .update({ status: "cancelled", ends_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Featured listing cancelled");
    qc.invalidateQueries({ queryKey: ["admin_featured_workers"] });
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-hero-foreground/60">Active Now</p>
            <Star className="h-4 w-4 text-star" />
          </div>
          <p className="mt-1 text-2xl font-bold text-hero-foreground">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-hero-foreground/60">Total Promotions</p>
            <Clock className="h-4 w-4 text-hero-foreground/60" />
          </div>
          <p className="mt-1 text-2xl font-bold text-hero-foreground">{featured.length}</p>
        </div>
        <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-hero-foreground/60">Sparks Spent</p>
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1 text-2xl font-bold text-hero-foreground">{totalSparks.toLocaleString()}</p>
        </div>
      </div>

      <p className="rounded-xl border border-hero-foreground/10 bg-hero-foreground/[0.03] p-3 text-xs text-hero-foreground/60">
        Workers feature their listings instantly by spending Sparks — no admin approval required. This panel is a read-only view of all promotions.
      </p>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hero-foreground/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by worker name, profession or category…"
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["active", "all"] as const).map((s) => (
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
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-8 text-center text-sm text-hero-foreground/60">
          No featured workers.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((f: any) => {
            const p = (profiles as any)[f.user_id];
            const w = (workers as any)[f.worker_id];
            const isActive = f.status === "active" && new Date(f.ends_at).getTime() > now;
            return (
              <div
                key={f.id}
                className="flex flex-col gap-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-3 sm:flex-row sm:flex-wrap sm:items-center"
              >
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 text-sm font-bold text-primary">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (p?.full_name || "??").slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-hero-foreground">{p?.full_name || "Unknown"}</p>
                    <p className="truncate text-[11px] text-hero-foreground/60">
                      {w?.profession || "—"}
                      {w?.main_category && <> · {w.main_category}</>}
                    </p>
                    <p className="mt-0.5 text-[10px] text-hero-foreground/50">
                      {format(new Date(f.starts_at), "MMM d")} → {format(new Date(f.ends_at), "MMM d, yyyy")}
                      {isActive && (
                        <> · ends {formatDistanceToNow(new Date(f.ends_at), { addSuffix: true })}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Zap className="h-3 w-3 text-primary" /> {f.sparks_cost}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{f.duration_days}d</Badge>
                  <Badge variant="outline" className="text-[10px]">{f.radius_km}km</Badge>
                  <Badge
                    variant="outline"
                    className={
                      isActive
                        ? "border-success/40 text-success"
                        : f.status === "cancelled"
                        ? "border-destructive/40 text-destructive"
                        : "border-hero-foreground/20 text-hero-foreground/50"
                    }
                  >
                    {isActive ? "active" : f.status}
                  </Badge>
                  {isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancel(f.id)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <XCircle className="mr-1 h-3 w-3" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeaturedManagementTab;
