import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

interface Row {
  id: string;
  worker_user_id: string;
  current_latitude: number | null;
  current_longitude: number | null;
  requested_latitude: number;
  requested_longitude: number;
  reason: string;
  status: string;
  admin_comment: string;
  created_at: string;
  decided_at: string | null;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
}

const LocationChangeRequestsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("worker_location_change_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list: Row[] = data || [];
    if (list.length) {
      const ids = Array.from(new Set(list.map((r) => r.worker_user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", ids);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      list.forEach((r) => (r.profile = map.get(r.worker_user_id) || null));
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (r: Row, status: "approved" | "rejected") => {
    setBusy(r.id);
    try {
      const { data: u } = await supabase.auth.getUser();
      const comment = comments[r.id] || "";
      if (status === "approved") {
        const { error: wErr } = await supabase
          .from("workers")
          .update({
            latitude: r.requested_latitude,
            longitude: r.requested_longitude,
          })
          .eq("user_id", r.worker_user_id);
        if (wErr) throw wErr;
      }
      const { error } = await (supabase as any)
        .from("worker_location_change_requests")
        .update({
          status,
          admin_comment: comment,
          decided_by: u.user?.id,
          decided_at: new Date().toISOString(),
        })
        .eq("id", r.id);
      if (error) throw error;
      toast.success(`Request ${status}`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">No location change requests.</p>;

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-start gap-3">
            {r.profile?.avatar_url ? (
              <img src={r.profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.profile?.full_name || r.worker_user_id}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()} ·{" "}
                <span className={
                  r.status === "pending" ? "text-amber-600" :
                  r.status === "approved" ? "text-emerald-600" : "text-destructive"
                }>{r.status}</span>
              </p>
              <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  Current: {r.current_latitude?.toFixed(5) ?? "—"}, {r.current_longitude?.toFixed(5) ?? "—"}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Requested: {r.requested_latitude.toFixed(5)}, {r.requested_longitude.toFixed(5)}
                </div>
              </div>
              {r.reason && <p className="mt-2 text-sm"><span className="text-muted-foreground">Reason: </span>{r.reason}</p>}
              <a
                href={`https://www.openstreetmap.org/?mlat=${r.requested_latitude}&mlon=${r.requested_longitude}#map=16/${r.requested_latitude}/${r.requested_longitude}`}
                target="_blank" rel="noreferrer"
                className="mt-1 inline-block text-xs text-primary underline"
              >
                View on map
              </a>
              {r.admin_comment && r.status !== "pending" && (
                <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs">
                  <span className="font-semibold">Admin comment: </span>{r.admin_comment}
                </p>
              )}
            </div>
          </div>

          {r.status === "pending" && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Add a comment (optional for approve, recommended for reject)…"
                value={comments[r.id] || ""}
                onChange={(e) => setComments((s) => ({ ...s, [r.id]: e.target.value }))}
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.id}
                  onClick={() => decide(r, "rejected")}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  disabled={busy === r.id}
                  onClick={() => decide(r, "approved")}
                >
                  Approve & Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LocationChangeRequestsTab;
