import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Users, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/adminAudit";
import { useAuth } from "@/contexts/AuthContext";

const sb = supabase as any;

type Audience = "all" | "donors" | "workers" | "customers";

export default function PushBroadcastTab() {
  const { user } = useAuth();
  const [audience, setAudience] = useState<Audience>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: counts } = useQuery({
    queryKey: ["push_audience_counts"],
    queryFn: async () => {
      const [allSubs, donors, workers, roleRows] = await Promise.all([
        sb.from("push_subscriptions").select("user_id"),
        sb.from("profiles").select("user_id").eq("is_blood_donor", true),
        sb.from("workers").select("user_id"),
        sb.from("user_roles").select("user_id, role"),
      ]);
      const subUserIds = new Set((allSubs.data || []).map((r: any) => r.user_id));
      const donorIds = new Set((donors.data || []).map((r: any) => r.user_id));
      const workerIds = new Set((workers.data || []).map((r: any) => r.user_id));
      const nonCustomerIds = new Set(
        (roleRows.data || [])
          .filter((r: any) => r.role !== "customer")
          .map((r: any) => r.user_id)
      );
      return {
        all: subUserIds.size,
        donors: Array.from(donorIds).filter((id) => subUserIds.has(id)).length,
        workers: Array.from(workerIds).filter((id) => subUserIds.has(id)).length,
        customers: Array.from(subUserIds).filter((id) => !nonCustomerIds.has(id)).length,
      };
    },
    refetchInterval: 60_000,
  });

  const audienceTarget = useMemo(
    () => ({
      all: counts?.all ?? 0,
      donors: counts?.donors ?? 0,
      workers: counts?.workers ?? 0,
      customers: counts?.customers ?? 0,
    }),
    [counts]
  );

  const resolveUserIds = async (): Promise<string[] | null> => {
    if (audience === "all") return null; // broadcast
    if (audience === "donors") {
      const { data } = await sb.from("profiles").select("user_id").eq("is_blood_donor", true);
      return (data || []).map((r: any) => r.user_id);
    }
    if (audience === "workers") {
      const { data } = await sb.from("workers").select("user_id");
      return (data || []).map((r: any) => r.user_id);
    }
    // customers = users without admin/manager/ads_manager/moderator/worker roles
    const [allProfiles, roleRows] = await Promise.all([
      sb.from("profiles").select("user_id"),
      sb.from("user_roles").select("user_id, role"),
    ]);
    const nonCustomer = new Set(
      (roleRows.data || [])
        .filter((r: any) => r.role !== "customer")
        .map((r: any) => r.user_id)
    );
    return (allProfiles.data || [])
      .map((r: any) => r.user_id)
      .filter((id: string) => !nonCustomer.has(id));
  };

  const send = async () => {
    if (!title.trim()) return toast.error("Title is required");
    setBusy(true);
    try {
      const ids = await resolveUserIds();
      const payload: any = {
        title: title.trim(),
        body: body.trim() || undefined,
        url: url.trim() || "/",
        tag: `broadcast-${Date.now()}`,
        urgent,
      };
      if (ids === null) payload.broadcast = true;
      else payload.user_ids = ids;

      const { data, error } = await supabase.functions.invoke("send-push", { body: payload });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      toast.success(`Push sent to ${sent} device(s)`);
      if (user?.id) {
        logAdminAction({
          adminUserId: user.id,
          action: "push.broadcast",
          targetType: "audience",
          targetId: audience,
          metadata: { title: payload.title, sent, audience },
        });
      }
      setTitle("");
      setBody("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  const AUDIENCES: { key: Audience; label: string; icon: typeof Users }[] = [
    { key: "all", label: "All subscribers", icon: Globe },
    { key: "donors", label: "Blood donors", icon: Users },
    { key: "workers", label: "Workers", icon: Users },
    { key: "customers", label: "Customers", icon: Users },
  ];

  return (
    <section>
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-hero-foreground">
          <Bell className="h-5 w-5 text-primary" /> Push Broadcast
        </h2>
        <p className="text-sm text-hero-foreground/60">
          Send a push notification to a segment of your users.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <Label className="text-xs uppercase tracking-wider text-hero-foreground/60">
            Audience
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {AUDIENCES.map(({ key, label, icon: Icon }) => {
              const active = audience === key;
              return (
                <button
                  key={key}
                  onClick={() => setAudience(key)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/15 text-hero-foreground"
                      : "border-hero-foreground/10 bg-hero-foreground/[0.02] text-hero-foreground/70 hover:border-hero-foreground/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-4 w-4" />
                    <Badge variant="outline" className="text-[10px]">
                      {audienceTarget[key]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs font-bold">{label}</p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-hero-foreground/50">
            Counts reflect users with at least one registered push device.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-4">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={300} />
          </div>
          <div>
            <Label>Open URL on tap</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/" />
          </div>
          <label className="flex items-center gap-2 text-sm text-hero-foreground/80">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
            />
            Send as urgent (high-priority)
          </label>
          <Button onClick={send} disabled={busy || !title.trim()} className="w-full gap-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to {audienceTarget[audience]} user(s)
          </Button>
        </div>
      </div>
    </section>
  );
}
