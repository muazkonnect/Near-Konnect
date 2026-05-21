import { useEffect, useState } from "react";
import { BadgeCheck, X, RefreshCw, ShieldCheck, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
        <a key={d.kind} href={d.url} target="_blank" rel="noopener noreferrer" className="block">
          <div className="aspect-[4/3] rounded-lg overflow-hidden border bg-muted">
            <img src={d.url} alt={d.kind} className="h-full w-full object-cover" />
          </div>
          <p className="mt-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{d.kind.replace("_", " ")}</p>
        </a>
      ))}
    </div>
  );
}

export default function VerificationsAdminPanel() {
  const { data: list = [], isLoading } = useAdminVerifications();
  const decide = useAdminDecideVerification();
  const { data: settings } = useVerificationSettings();
  const updateSettings = useUpdateVerificationSettings();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ sparks_cost?: number; enabled?: boolean; auto_approve_on_persona_pass?: boolean; persona_template_id?: string }>({});

  const pending = list.filter((v) => v.status === "submitted");
  const others = list.filter((v) => v.status !== "submitted");

  const saveSettings = async () => {
    try {
      await updateSettings.mutateAsync(editing);
      setEditing({});
      toast.success("Verification settings saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const handle = async (id: string, status: "approved" | "rejected" | "resubmit") => {
    try {
      await decide.mutateAsync({ id, status, note: notes[id] || "" });
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
            {pending.map((v) => {
              const payload: any = (v as any).persona_payload || {};
              // Try to pull out commonly-named identity fields from Didit decision.
              const idv = payload.id_verification || payload.kyc || payload.document || {};
              const info = {
                name: idv.full_name || [idv.first_name, idv.last_name].filter(Boolean).join(" ") || payload.full_name || "",
                dob: idv.date_of_birth || idv.dob || "",
                doc_type: idv.document_type || idv.type || "",
                doc_number: idv.document_number || idv.number || "",
                nationality: idv.nationality || idv.issuing_country || "",
                expires: idv.expiration_date || idv.expires_at || "",
              };
              return (
              <li key={v.id} className="rounded-xl border bg-card p-3">
                <div className="text-xs">
                  <p className="font-mono break-all">Worker: {v.worker_id}</p>
                  <p className="text-muted-foreground">Didit session: {v.persona_inquiry_id || "—"}</p>
                  <p className="text-muted-foreground">Didit status: {(v as any).persona_status || "—"}</p>
                  <p className="text-muted-foreground">Submitted: {v.submitted_at ? new Date(v.submitted_at).toLocaleString() : "—"}</p>
                </div>
                {Object.values(info).some(Boolean) && (
                  <div className="mt-2 rounded-lg border bg-muted/30 p-2 text-[11px] grid grid-cols-2 gap-x-3 gap-y-1">
                    {info.name && <div><span className="text-muted-foreground">Name:</span> <span className="font-semibold">{info.name}</span></div>}
                    {info.dob && <div><span className="text-muted-foreground">DOB:</span> {info.dob}</div>}
                    {info.doc_type && <div><span className="text-muted-foreground">Doc type:</span> {info.doc_type}</div>}
                    {info.doc_number && <div><span className="text-muted-foreground">Doc #:</span> {info.doc_number}</div>}
                    {info.nationality && <div><span className="text-muted-foreground">Nationality:</span> {info.nationality}</div>}
                    {info.expires && <div><span className="text-muted-foreground">Expires:</span> {info.expires}</div>}
                  </div>
                )}
                <DocsViewer verificationId={v.id} />
                <Textarea
                  placeholder="Optional note to user"
                  className="mt-2"
                  value={notes[v.id] || ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [v.id]: e.target.value }))}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handle(v.id, "approved")} disabled={decide.isPending}>
                    <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handle(v.id, "resubmit")} disabled={decide.isPending}>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" /> Request resubmit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handle(v.id, "rejected")} disabled={decide.isPending}>
                    <X className="mr-1 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold">History ({others.length})</h3>
        <ul className="max-h-80 space-y-1 overflow-auto">
          {others.map((v) => (
            <li key={v.id} className="flex items-center justify-between rounded border bg-card px-3 py-2 text-xs">
              <span className="font-mono truncate">{v.worker_id}</span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${
                v.status === "approved" ? "bg-emerald-500/10 text-emerald-600" :
                v.status === "rejected" ? "bg-destructive/10 text-destructive" :
                "bg-muted text-muted-foreground"
              }`}>{v.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
