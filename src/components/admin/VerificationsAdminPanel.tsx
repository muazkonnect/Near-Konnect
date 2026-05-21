import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, X, RefreshCw, ShieldCheck, Loader2, ImageIcon, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  if (loading) return <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading docs…</div>;
  if (docs.length === 0) return <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><ImageIcon className="h-3 w-3" /> No documents uploaded</p>;
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {docs.map((d) => (
        <a key={d.kind + d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="block">
          <div className="aspect-[4/3] rounded-lg overflow-hidden border bg-muted">
            <img src={d.url} alt={d.kind} className="h-full w-full object-cover" />
          </div>
          <p className="mt-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{d.kind.replace("_", " ")}</p>
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
  const payload: any = v.persona_payload || {};
  const idv = payload.id_verification || payload.kyc || payload.document || {};
  const info = {
    name: idv.full_name || [idv.first_name, idv.last_name].filter(Boolean).join(" ") || payload.full_name || "",
    dob: idv.date_of_birth || idv.dob || "",
    doc_type: idv.document_type || idv.type || "",
    doc_number: idv.document_number || idv.number || "",
    nationality: idv.nationality || idv.issuing_country || "",
    expires: idv.expiration_date || idv.expires_at || "",
    gender: idv.gender || "",
    address: idv.address || idv.formatted_address || "",
    issuing_state: idv.issuing_state || "",
  };
  const prof = v._profile || {};
  const displayName = prof.full_name || info.name || "Unnamed worker";

  return (
    <li className="rounded-xl border bg-card overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors text-left">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center overflow-hidden shrink-0">
            {prof.avatar_url ? <img src={prof.avatar_url} alt="" className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {prof.city || "—"} · {v.persona_status || "submitted"} · {v.submitted_at ? new Date(v.submitted_at).toLocaleString() : "—"}
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            <div className="rounded-lg border bg-muted/30 p-2 text-[11px] grid grid-cols-2 gap-x-3 gap-y-1">
              <div><span className="text-muted-foreground">Worker ID:</span> <span className="font-mono break-all">{v.worker_id}</span></div>
              <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono break-all">{v.user_id}</span></div>
              <div><span className="text-muted-foreground">Didit session:</span> <span className="font-mono break-all">{v.persona_inquiry_id || "—"}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> {prof.phone || "—"}</div>
              {info.name && <div><span className="text-muted-foreground">Name on ID:</span> <span className="font-semibold">{info.name}</span></div>}
              {info.dob && <div><span className="text-muted-foreground">DOB:</span> {info.dob}</div>}
              {info.gender && <div><span className="text-muted-foreground">Gender:</span> {info.gender}</div>}
              {info.doc_type && <div><span className="text-muted-foreground">Doc type:</span> {info.doc_type}</div>}
              {info.doc_number && <div><span className="text-muted-foreground">Doc #:</span> {info.doc_number}</div>}
              {info.nationality && <div><span className="text-muted-foreground">Nationality:</span> {info.nationality}</div>}
              {info.issuing_state && <div><span className="text-muted-foreground">Issuing state:</span> {info.issuing_state}</div>}
              {info.expires && <div><span className="text-muted-foreground">Expires:</span> {info.expires}</div>}
              {info.address && <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {info.address}</div>}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Captured documents & selfie</p>
              <DocsViewer verificationId={v.id} />
            </div>

            {Object.keys(payload).length > 0 && (
              <details className="rounded-lg border bg-muted/20 p-2">
                <summary className="text-[11px] font-semibold text-muted-foreground cursor-pointer">Raw Didit payload</summary>
                <pre className="mt-2 max-h-64 overflow-auto text-[10px] leading-relaxed whitespace-pre-wrap break-all">{JSON.stringify(payload, null, 2)}</pre>
              </details>
            )}

            <Textarea
              placeholder="Optional note to user"
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
