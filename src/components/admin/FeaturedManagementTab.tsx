import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Star,
  Plus,
  Trash2,
  Eye,
  MousePointerClick,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const FeaturedManagementTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [priority, setPriority] = useState("100");
  const [startsAt, setStartsAt] = useState<Date | undefined>(undefined);
  const [endsAt, setEndsAt] = useState<Date | undefined>(undefined);
  const [search, setSearch] = useState("");

  const { data: workers = [] } = useQuery({
    queryKey: ["admin_workers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("id, profession, user_id, profiles!workers_user_id_fkey_profiles(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: featuredServices = [] } = useQuery({
    queryKey: ["admin_featured_services"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("featured_services")
        .select("id, service_id, owner_user_id, priority, is_active, starts_at, ends_at, created_at")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["admin_featured_requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("featured_requests")
        .select("id, worker_id, user_id, message, status, created_at, decided_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: stats = [] } = useQuery({
    queryKey: ["admin_featured_stats"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_featured_stats", { _days: 30 });
      if (error) throw error;
      return data as { worker_id: string; impressions: number; clicks: number; ctr: number }[];
    },
  });

  const statsMap = useMemo(
    () => new Map(stats.map((s) => [s.worker_id, s])),
    [stats]
  );
  const featuredMap = useMemo(
    () => new Map((featuredServices as any[]).map((f) => [f.service_id, f])),
    [featuredServices]
  );
  const workerMap = useMemo(
    () => new Map((workers as any[]).map((w) => [w.id, w])),
    [workers]
  );

  const totalImpressions = stats.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const totalClicks = stats.reduce((s, r) => s + Number(r.clicks || 0), 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  const addFeatured = async (workerIdParam?: string, priorityParam?: number) => {
    const wId = workerIdParam || selectedWorkerId;
    if (!wId) return toast.error("Select a worker first");
    const worker = workerMap.get(wId);
    const { error } = await (supabase as any).from("featured_services").insert({
      service_id: wId,
      owner_user_id: worker?.user_id || null,
      priority: priorityParam ?? (Number(priority) || 100),
      is_active: true,
      starts_at: startsAt ? startsAt.toISOString() : null,
      ends_at: endsAt ? endsAt.toISOString() : null,
      created_by: user?.id || null,
    });
    if (error) return toast.error("Failed to add featured listing");
    toast.success("Featured listing created");
    setSelectedWorkerId("");
    setStartsAt(undefined);
    setEndsAt(undefined);
    queryClient.invalidateQueries({ queryKey: ["admin_featured_services"] });
    queryClient.invalidateQueries({ queryKey: ["featured_services_active"] });
  };

  const removeFeatured = async (id: string) => {
    const { error } = await (supabase as any).from("featured_services").delete().eq("id", id);
    if (error) return toast.error("Failed to remove");
    toast.success("Removed from featured");
    queryClient.invalidateQueries({ queryKey: ["admin_featured_services"] });
    queryClient.invalidateQueries({ queryKey: ["featured_services_active"] });
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await (supabase as any)
      .from("featured_services")
      .update({ is_active: !active })
      .eq("id", id);
    if (error) return toast.error("Failed to toggle");
    toast.success(!active ? "Enabled" : "Disabled");
    queryClient.invalidateQueries({ queryKey: ["admin_featured_services"] });
    queryClient.invalidateQueries({ queryKey: ["featured_services_active"] });
  };

  const updatePriority = async (id: string, newPriority: number) => {
    const { error } = await (supabase as any)
      .from("featured_services")
      .update({ priority: newPriority })
      .eq("id", id);
    if (error) return toast.error("Failed to update priority");
    queryClient.invalidateQueries({ queryKey: ["admin_featured_services"] });
    queryClient.invalidateQueries({ queryKey: ["featured_services_active"] });
  };

  const approveRequest = async (req: any) => {
    // Add to featured_services and mark approved
    const worker = workerMap.get(req.worker_id);
    const { error: insertError } = await (supabase as any).from("featured_services").insert({
      service_id: req.worker_id,
      owner_user_id: worker?.user_id || req.user_id,
      priority: 100,
      is_active: true,
      created_by: user?.id || null,
    });
    if (insertError && !String(insertError.message || "").includes("duplicate")) {
      return toast.error("Failed to feature worker");
    }
    const { error } = await (supabase as any)
      .from("featured_requests")
      .update({ status: "approved", decided_at: new Date().toISOString(), decided_by: user?.id })
      .eq("id", req.id);
    if (error) return toast.error("Failed to update request");
    toast.success("Request approved & worker featured");
    queryClient.invalidateQueries({ queryKey: ["admin_featured_requests"] });
    queryClient.invalidateQueries({ queryKey: ["admin_featured_services"] });
    queryClient.invalidateQueries({ queryKey: ["featured_services_active"] });
  };

  const denyRequest = async (req: any) => {
    const { error } = await (supabase as any)
      .from("featured_requests")
      .update({ status: "denied", decided_at: new Date().toISOString(), decided_by: user?.id })
      .eq("id", req.id);
    if (error) return toast.error("Failed to update request");
    toast.success("Request denied");
    queryClient.invalidateQueries({ queryKey: ["admin_featured_requests"] });
  };

  const filteredFeatured = (featuredServices as any[]).filter((f) => {
    if (!search) return true;
    const w = workerMap.get(f.service_id);
    return (
      (w?.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (w?.profession || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const pendingRequests = requests.filter((r: any) => r.status === "pending");

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-hero-foreground/60">Active</p>
            <Star className="h-4 w-4 text-star" />
          </div>
          <p className="mt-1 text-2xl font-bold text-hero-foreground">
            {(featuredServices as any[]).filter((f) => f.is_active).length}
          </p>
        </div>
        <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-hero-foreground/60">Impressions (30d)</p>
            <Eye className="h-4 w-4 text-hero-foreground/60" />
          </div>
          <p className="mt-1 text-2xl font-bold text-hero-foreground">{totalImpressions.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-hero-foreground/60">Clicks (30d)</p>
            <MousePointerClick className="h-4 w-4 text-hero-foreground/60" />
          </div>
          <p className="mt-1 text-2xl font-bold text-hero-foreground">{totalClicks.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-hero-foreground/60">CTR</p>
            <TrendingUp className="h-4 w-4 text-hero-foreground/60" />
          </div>
          <p className="mt-1 text-2xl font-bold text-hero-foreground">{overallCtr}%</p>
        </div>
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-hero-foreground" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-hero-foreground">
              Pending Requests ({pendingRequests.length})
            </h3>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req: any) => {
              const worker = workerMap.get(req.worker_id);
              return (
                <div key={req.id} className="flex flex-col gap-3 rounded-xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-hero-foreground">
                      {worker?.profiles?.full_name || "Unknown"} · <span className="font-medium text-hero-foreground/50">{worker?.profession}</span>
                    </p>
                    {req.message && (
                      <p className="mt-1 line-clamp-2 text-xs text-hero-foreground/60">"{req.message}"</p>
                    )}
                    <p className="text-[10px] text-hero-foreground/60">
                      Requested {new Date(req.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Button size="sm" onClick={() => approveRequest(req)} className="gap-1">
                      <CheckCircle className="h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => denyRequest(req)} className="gap-1">
                      <XCircle className="h-3 w-3" /> Deny
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add featured form */}
      <div className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-hero-foreground/60">Add Featured Worker</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
          <div className="md:col-span-2">
            <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent>
                {(workers as any[]).map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.profiles?.full_name || "Unnamed"} — {w.profession}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="number"
            placeholder="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start font-normal", !startsAt && "text-hero-foreground/60")}>
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{startsAt ? format(startsAt, "PP") : "Start date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startsAt} onSelect={setStartsAt} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start font-normal", !endsAt && "text-hero-foreground/60")}>
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{endsAt ? format(endsAt, "PP") : "End date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endsAt} onSelect={setEndsAt} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => addFeatured()} className="gap-1">
            <Plus className="h-4 w-4" /> Add to Featured
          </Button>
        </div>
      </div>

      {/* Featured list */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-hero-foreground/60">
            Active Featured ({filteredFeatured.length})
          </h3>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="space-y-2">
          {filteredFeatured.map((f: any) => {
            const w = workerMap.get(f.service_id);
            const s = statsMap.get(f.service_id);
            return (
              <div key={f.id} className="flex flex-col gap-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex flex-1 items-center gap-2">
                  <Star className={`h-4 w-4 shrink-0 ${f.is_active ? "fill-star text-star" : "text-hero-foreground/60"}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-hero-foreground">
                      {w?.profiles?.full_name || w?.profession || "Service"}
                    </p>
                    <p className="truncate text-[11px] text-hero-foreground/50">
                      {w?.profession}
                      {f.starts_at && ` · from ${format(new Date(f.starts_at), "MMM d")}`}
                      {f.ends_at && ` · until ${format(new Date(f.ends_at), "MMM d")}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-hero-foreground/60">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {s?.impressions ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MousePointerClick className="h-3 w-3" /> {s?.clicks ?? 0}
                  </span>
                  <Badge variant="outline" className="text-[10px]">CTR {s?.ctr ?? 0}%</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Input
                    type="number"
                    defaultValue={f.priority}
                    className="h-9 w-20"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v && v !== f.priority) updatePriority(f.id, v);
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={() => toggleActive(f.id, f.is_active)}>
                    {f.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeFeatured(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {filteredFeatured.length === 0 && (
            <p className="py-8 text-center text-sm text-hero-foreground/60">No featured workers yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeaturedManagementTab;
