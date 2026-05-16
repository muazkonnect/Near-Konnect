import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Row {
  id: string;
  user_id: string;
  reason: string;
  status: string;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
}

const AvatarResetsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("avatar_reset_requests")
      .select("id, user_id, reason, status, created_at")
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false });
    const list: Row[] = data || [];
    if (list.length) {
      const ids = list.map((r) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", ids);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      list.forEach((r) => (r.profile = map.get(r.user_id) || null));
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, status: "approved" | "denied") => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("avatar_reset_requests")
      .update({ status, decided_by: u.user?.id, decided_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Request ${status}`);
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">No pending avatar reset requests.</p>;

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
          {r.profile?.avatar_url ? (
            <img src={r.profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{r.profile?.full_name || r.user_id}</p>
            <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {r.status}</p>
            {r.reason && <p className="mt-1 text-sm">{r.reason}</p>}
          </div>
          {r.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => decide(r.id, "denied")}>Deny</Button>
              <Button size="sm" onClick={() => decide(r.id, "approved")}>Approve</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AvatarResetsTab;
