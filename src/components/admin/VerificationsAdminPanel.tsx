import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck, X, RefreshCw, ShieldCheck, Loader2, ImageIcon,
  ChevronDown, User, Fingerprint, ScanFace, Activity, AlertTriangle, Clock, MapPin, Hash, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  useAdminVerifications,
  useAdminDecideVerification,
  useVerificationSettings,
  useUpdateVerificationSettings,
} from "@/hooks/useVerification";
import { supabase } from "@/integrations/supabase/client";
import { getVerificationDocSignedUrl } from "@/services/verificationService";

const DOC_LABELS: Record<string, string> = {
  id_front: "ID — Front",
  id_back: "ID — Back",
  selfie: "Live Selfie",
};

function statusTone(s?: string | null) {
  const v = (s || "").toLowerCase();
  if (["approved", "passed", "success", "verified", "match"].some((k) => v.includes(k))) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (["declined", "failed", "rejected", "no_match"].some((k) => v.includes(k))) return "bg-destructive/15 text-destructive border-destructive/30";
  if (["review", "warn", "pending", "in_progress"].some((k) => v.includes(k))) return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function StatusPill({ label, status, icon: Icon }: { label: string; status?: string | null; icon?: any }) {
  if (!status) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusTone(status)}`}>
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {label}: {status}
    </span>
  );
}

function Field({ label, value, mono, icon: Icon }: { label: string; value?: any; mono?: boolean; icon?: any }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      {Icon ? <Icon className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" /> : null}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-[12px] font-medium break-words ${mono ? "font-mono" : ""}`}>{String(value)}</p>
      </div>
    </div>
  );
}

function DocsViewer({ verificationId }: { verificationId: string }) {
  const [docs, setDocs] = useState<{ kind: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("verification_documents")
        .select("kind, storage_path")
        .eq("verification_id", verificationId);
      const signed = await Promise.all(
        (data || []).map(async (d: any) => ({ kind: d.kind, url: (await getVerificationDocSignedUrl(d.storage_path, 900)) || "" }))
      );
      if (!cancel) { setDocs(signed.filter((d) => d.url)); setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [verificationId]);
  if (loading) return <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading captures…</div>;
  if (docs.length === 0) return <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><ImageIcon className="h-3 w-3" /> No captures stored yet</p>;
  return (
    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
      {docs.map((d) => (
        <a key={d.kind + d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="group block">
          <div className="aspect-[4/3] rounded-lg overflow-hidden border bg-muted ring-1 ring-border group-hover:ring-primary/40 transition">
            <img src={d.url} alt={d.kind} className="h-full w-full object-cover" />
          </div>
          <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{DOC_LABELS[d.kind] || d.kind}</p>
        </a>
      ))}
    </div>
  );
}

function useWorkerProfiles(userIds: string[]) {
  const [map, setMap] = useState<Record<string, { full_name: string; phone?: string; avatar_url?: string; city?: string }>>({});
  const key = userIds.slice().sort().join(",");
  useEffect(() => {
    if (!userIds.length) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url, city")
        .in("user_id", userIds);
      const m: any = {};
      (data || []).forEach((p: any) => { m[p.user_id] = p; });
      setMap(m);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return map;
}

function VerificationItem({ v, onDecide, busy }: { v: any; onDecide: (id: string, status: "approved" | "rejected" | "resubmit", note: string) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const d: any = v.persona_payload || {};

  const idv: any = d.id_verification || d.kyc || d.document || {};
  const face: any = d.face_match || d.face || {};
  const live: any = d.liveness || {};
  const aml: any = d.aml || {};
  const warnings: any[] = Array.isArray(d.warnings) ? d.warnings : [];
  const reviews: any[] = Array.isArray(d.reviews) ? d.reviews : [];

  const fullName =
    idv.full_name || [idv.first_name, idv.last_name].filter(Boolean).join(" ") || d.full_name || "";

  const prof = v._profile || {};
  const displayName = prof.full_name || fullName || "Unnamed worker";
  const overall = d.status || d.decision || v.persona_status || v.status;

  return (
    <li className="rounded-xl border bg-card overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors text-left">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-border">
            {prof.avatar_url ? <img src={prof.avatar_url} alt="" className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <Clock className="h-3 w-3" />{v.submitted_at ? new Date(v.submitted_at).toLocaleString() : "—"}
              {prof.city ? <> · <MapPin className="h-3 w-3" />{prof.city}</> : null}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <StatusPill label="Didit" status={overall} icon={ShieldCheck} />
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t">
            <div className="flex flex-wrap gap-1.5 pt-3">
              <StatusPill label="Overall" status={overall} icon={ShieldCheck} />
              <StatusPill label="ID" status={idv.status} icon={Fingerprint} />
              <StatusPill label="Face Match" status={face.status} icon={ScanFace} />
              <StatusPill label="Liveness" status={live.status} icon={Activity} />
              <StatusPill label="AML" status={aml.status} icon={AlertTriangle} />
              {typeof face.score === "number" && (
                <span className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-[10px] font-semibold">
                  Face score: {Math.round(face.score * 100)}%
                </span>
              )}
              {typeof live.score === "number" && (
                <span className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-[10px] font-semibold">
                  Liveness score: {Math.round(live.score * 100)}%
                </span>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Captured documents & selfie</p>
              <DocsViewer verificationId={v.id} />
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Identity (from Didit)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Full name" value={fullName} icon={User} />
                <Field label="Date of birth" value={idv.date_of_birth || idv.dob} />
                <Field label="Gender" value={idv.gender} />
                <Field label="Document type" value={idv.document_type || idv.type} />
                <Field label="Document #" value={idv.document_number || idv.number} mono icon={Hash} />
                <Field label="Nationality" value={idv.nationality} />
                <Field label="Issuing country" value={idv.issuing_country || idv.country} />
                <Field label="Issuing state" value={idv.issuing_state_name || idv.issuing_state} />
                <Field label="Expires" value={idv.expiration_date || idv.expires_at} />
                <Field label="Issued" value={idv.date_of_issue || idv.issued_at} />
                <Field label="Place of birth" value={idv.place_of_birth} />
                <Field label="Address" value={idv.formatted_address || idv.address} icon={MapPin} />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Worker phone" value={prof.phone} icon={Phone} />
              <Field label="Didit session" value={v.persona_inquiry_id} mono />
              <Field label="Worker ID" value={v.worker_id} mono />
              <Field label="User ID" value={v.user_id} mono />
              <Field label="Submitted" value={v.submitted_at ? new Date(v.submitted_at).toLocaleString() : null} />
              <Field label="Decision at" value={d.completed_at || d.decided_at} />
            </div>

            {(warnings.length > 0 || reviews.length > 0) && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-1">
                  Warnings & reviewer notes
                </p>
                {warnings.map((w, i) => (
                  <p key={`w${i}`} className="text-[11px] text-amber-800 dark:text-amber-200">
                    • {(w?.code || w?.type || "warning")}: {(w?.message || w?.description || JSON.stringify(w))}
                  </p>
                ))}
                {reviews.map((r, i) => (
                  <p key={`r${i}`} className="text-[11px] text-amber-800 dark:text-amber-200">
                    • {(r?.label || r?.type || "review")}: {(r?.message || r?.comment || JSON.stringify(r))}
                  </p>
                ))}
              </div>
            )}

            {Object.keys(d).length > 0 && (
              <details className="rounded-lg border bg-muted/20 p-2">
                <summary className="text-[11px] font-semibold text-muted-foreground cursor-pointer">Raw Didit payload</summary>
                <pre className="mt-2 max-h-72 overflow-auto text-[10px] leading-relaxed whitespace-pre-wrap break-all">{JSON.stringify(d, null, 2)}</pre>
              </details>
            )}

            <Textarea
              placeholder="Optional note to user (sent with decision)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onDecide(v.id, "approved", note)} disabled={busy}>
                <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDecide(v.id, "resubmit", note)} disabled={busy}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Request resubmit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDecide(v.id, "rejected", note)} disabled={busy}>
                <X className="mr-1 h-3.5 w-3.5" /> Reject
              </Button>
              {v.status && (
                <Badge variant="outline" className="ml-auto self-center text-[10px]">Current: {v.status}</Badge>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

export default function VerificationsAdminPanel() {
  const { data: list = [], isLoading } = useAdminVerifications();
  const decide = useAdminDecideVerification();
  const { data: settings } = useVerificationSettings();
  const updateSettings = useUpdateVerificationSettings();
  const [editing, setEditing] = useState<{ sparks_cost?: number; enabled?: boolean; auto_approve_on_persona_pass?: boolean; persona_template_id?: string }>({});

  const userIds = useMemo(() => Array.from(new Set((list as any[]).map((v) => v.user_id).filter(Boolean))), [list]);
  const profiles = useWorkerProfiles(userIds);

  const decorated = (list as any[]).map((v) => ({ ...v, _profile: profiles[v.user_id] }));
  const pending = decorated.filter((v) => v.status === "submitted");
  const others = decorated.filter((v) => v.status !== "submitted");

  const saveSettings = async () => {
    try {
      await updateSettings.mutateAsync(editing);
      setEditing({});
      toast.success("Verification settings saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const handle = async (id: string, status: "approved" | "rejected" | "resubmit", note: string) => {
    try {
      await decide.mutateAsync({ id, status, note });
      toast.success(`Marked ${status}`);
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className="h-4 w-4" /> Verification settings
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Sparks cost</Label>
            <Input
              type="number"
              defaultValue={settings?.sparks_cost ?? 0}
              onChange={(e) => setEditing((s) => ({ ...s, sparks_cost: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label>Persona template ID</Label>
            <Input
              defaultValue={settings?.persona_template_id ?? ""}
              onChange={(e) => setEditing((s) => ({ ...s, persona_template_id: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-2">
            <Label className="m-0">Enabled</Label>
            <Switch
              defaultChecked={settings?.enabled ?? false}
              onCheckedChange={(v) => setEditing((s) => ({ ...s, enabled: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-2">
            <Label className="m-0">Auto-approve on Persona pass</Label>
            <Switch
              defaultChecked={settings?.auto_approve_on_persona_pass ?? false}
              onCheckedChange={(v) => setEditing((s) => ({ ...s, auto_approve_on_persona_pass: v }))}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={saveSettings} disabled={updateSettings.isPending || Object.keys(editing).length === 0}>
            Save
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
          <BadgeCheck className="h-4 w-4 text-primary" /> Pending submissions ({pending.length})
        </h3>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : pending.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing waiting.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((v) => (
              <VerificationItem key={v.id} v={v} onDecide={handle} busy={decide.isPending} />
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold">History ({others.length})</h3>
        <ul className="max-h-96 space-y-2 overflow-auto pr-1">
          {others.map((v) => (
            <VerificationItem key={v.id} v={v} onDecide={handle} busy={decide.isPending} />
          ))}
        </ul>
      </div>
    </div>
  );
}
