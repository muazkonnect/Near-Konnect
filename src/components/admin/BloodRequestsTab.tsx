import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Droplet, Search, Trash2, CheckCircle2, XCircle, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

const sb = supabase as any;

type BR = {
  id: string;
  requester_id: string;
  blood_group: string;
  urgency: string;
  message: string | null;
  city: string | null;
  status: string;
  created_at: string;
};

export default function BloodRequestsTab() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"open" | "closed" | "all">("open");
  const [search, setSearch] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin_blood_requests"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("blood_requests")
        .select("id, requester_id, blood_group, urgency, message, city, status, created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as BR[];
    },
    refetchInterval: 20_000,
  });

  const requesterIds = useMemo(
    () => Array.from(new Set(requests.map((r) => r.requester_id))),
    [requests]
  );
  const { data: profiles = {} } = useQuery({
    queryKey: ["admin_br_profiles", requesterIds.sort().join(",")],
    queryFn: async () => {
      if (!requesterIds.length) return {};
      const { data } = await sb
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", requesterIds);
      const m: Record<string, any> = {};
      (data || []).forEach((p: any) => (m[p.user_id] = p));
      return m;
    },
    enabled: requesterIds.length > 0,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      const p = (profiles as any)[r.requester_id];
      return (
        (p?.full_name || "").toLowerCase().includes(q) ||
        (p?.phone || "").toLowerCase().includes(q) ||
        (r.city || "").toLowerCase().includes(q) ||
        r.blood_group.toLowerCase().includes(q)
      );
    });
  }, [requests, profiles, status, search]);

  const setStatusOf = async (id: string, s: "open" | "closed") => {
    const { error } = await sb.from("blood_requests").update({ status: s }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Request marked ${s}`);
    qc.invalidateQueries({ queryKey: ["admin_blood_requests"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this blood request permanently?")) return;
    const { error } = await sb.from("blood_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin_blood_requests"] });
  };

  return (
    <section>
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-hero-foreground">
          <Droplet className="h-5 w-5 text-destructive" /> Blood Requests
        </h2>
        <p className="text-sm text-hero-foreground/60">
          Moderate active donor requests across the platform.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hero-foreground/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, city or group…"
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["open", "closed", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${
                status === s
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "ring-hero-foreground/15 text-hero-foreground/70 hover:bg-hero-foreground/10"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-6 text-center text-sm text-hero-foreground/60">
          No blood requests match.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const p = (profiles as any)[r.requester_id];
            return (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-3 sm:flex-row sm:flex-wrap sm:items-center"
              >
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 text-sm font-extrabold text-destructive">
                    {r.blood_group}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      r.urgency === "urgent" || r.urgency === "critical"
                        ? "border-destructive/40 text-destructive uppercase"
                        : "border-hero-foreground/20 text-hero-foreground/70 uppercase"
                    }
                  >
                    {r.urgency}
                  </Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-hero-foreground">
                    {p?.full_name || "Unknown"}
                    {p?.phone && (
                      <span className="ml-2 text-[11px] font-normal text-hero-foreground/50">
                        {p.phone}
                      </span>
                    )}
                  </p>
                  {r.message && (
                    <p className="line-clamp-2 text-xs text-hero-foreground/60">{r.message}</p>
                  )}
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] text-hero-foreground/50">
                    {r.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {r.city}
                      </span>
                    )}
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge
                    variant="outline"
                    className={
                      r.status === "open"
                        ? "border-primary/40 text-primary"
                        : "border-hero-foreground/20 text-hero-foreground/50"
                    }
                  >
                    {r.status}
                  </Badge>
                  {r.status === "open" ? (
                    <Button size="sm" variant="outline" onClick={() => setStatusOf(r.id, "closed")}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Close
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setStatusOf(r.id, "open")}>
                      <XCircle className="mr-1 h-3 w-3" /> Re-open
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(r.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
