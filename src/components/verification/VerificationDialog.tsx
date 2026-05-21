import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Sparkles, Loader2, CheckCircle2, AlertCircle, Upload, IdCard, Camera, X } from "lucide-react";
import { useMyVerification, useVerificationSettings } from "@/hooks/useVerification";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadVerificationDoc, startVerification, submitVerification, createPersonaInquiry } from "@/services/verificationService";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };
type Kind = "id_front" | "id_back" | "selfie";

const SLOTS: { kind: Kind; label: string; hint: string; icon: any }[] = [
  { kind: "id_front", label: "CNIC – Front", hint: "Clear photo of the front side", icon: IdCard },
  { kind: "id_back", label: "CNIC – Back", hint: "Clear photo of the back side", icon: IdCard },
  { kind: "selfie", label: "Live Selfie", hint: "Face clearly visible, well lit", icon: Camera },
];

export default function VerificationDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { balance } = useWallet();
  const { data: verification, refetch } = useMyVerification(user?.id);
  const { data: settings } = useVerificationSettings();
  const [files, setFiles] = useState<Partial<Record<Kind, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<Kind, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef<Record<Kind, HTMLInputElement | null>>({ id_front: null, id_back: null, selfie: null });

  const cost = settings?.sparks_cost ?? 500;
  const insufficient = balance < cost;
  const status = verification?.status ?? "none";
  const allUploaded = SLOTS.every((s) => files[s.kind]);

  useEffect(() => { if (open) refetch(); }, [open, refetch]);
  useEffect(() => () => { Object.values(previews).forEach((u) => u && URL.revokeObjectURL(u)); }, [previews]);

  const pick = (kind: Kind, f: File | null) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast.error("Max 8 MB per image");
    if (!f.type.startsWith("image/")) return toast.error("Image files only");
    setFiles((s) => ({ ...s, [kind]: f }));
    setPreviews((s) => ({ ...s, [kind]: URL.createObjectURL(f) }));
  };

  const toBase64 = (f: File) => new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f);
  });

  const handleSubmit = async () => {
    if (!user) return;
    if (insufficient) return toast.error(`Need ${cost} Sparks. Top up first.`);
    if (!allUploaded) return toast.error("Upload all three images first");

    setSubmitting(true);
    try {
      // 1. Liveness/face check on selfie
      const selfieB64 = await toBase64(files.selfie!);
      try {
        const { data: faceRes, error: faceErr } = await supabase.functions.invoke("verify-face-human", {
          body: { imageBase64: selfieB64 },
        });
        if (faceErr) throw faceErr;
        if (faceRes && faceRes.isHuman === false) {
          throw new Error(faceRes.reason || "Selfie does not look like a real human face");
        }
      } catch (e: any) {
        // Don't block submission on liveness service outage — only on explicit reject.
        if (String(e?.message || "").toLowerCase().includes("human")) throw e;
      }

      // 2. Ensure verification row exists (and reserves sparks via RPC)
      const row = await startVerification();

      // 3. Upload all three docs to private storage
      const uploads = await Promise.all(
        SLOTS.map(async (s) => {
          const path = await uploadVerificationDoc(user.id, files[s.kind]!, s.kind);
          return { kind: s.kind, path };
        })
      );

      // 4. Insert verification_documents rows
      const { error: docErr } = await (supabase as any).from("verification_documents").insert(
        uploads.map((u) => ({
          verification_id: row.id,
          user_id: user.id,
          kind: u.kind,
          storage_path: u.path,
        }))
      );
      if (docErr) throw docErr;

      // 5. Optional Persona inquiry (no-op if not configured)
      let inquiryId = `cnic_${crypto.randomUUID()}`;
      let sessionToken: string | null = null;
      try {
        const persona = await createPersonaInquiry();
        if (persona?.inquiry_id) { inquiryId = persona.inquiry_id; sessionToken = persona.session_token; }
      } catch { /* ignore */ }

      // 6. Mark submitted for admin review (this also deducts sparks via RPC)
      await submitVerification(inquiryId, sessionToken);

      toast.success("Documents submitted. Admin will review shortly.");
      setFiles({}); setPreviews({});
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/30">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">Verified Worker Badge</DialogTitle>
          <DialogDescription className="text-center">
            Upload your CNIC + a live selfie. Documents are private and reviewed by admins.
          </DialogDescription>
        </DialogHeader>

        {status === "approved" ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="font-bold">You're verified</p>
            <p className="text-xs text-muted-foreground">
              Badge active since {verification?.verified_at ? new Date(verification.verified_at).toLocaleDateString() : "—"}
            </p>
          </div>
        ) : status === "submitted" ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-bold">Under review</p>
            <p className="text-xs text-center text-muted-foreground">
              An admin is verifying your CNIC. You'll be notified once approved.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {(status === "rejected" || status === "resubmit") && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">
                    {status === "rejected" ? "Previously rejected" : "Resubmission required"}
                  </p>
                  {verification?.admin_note && <p className="text-xs text-muted-foreground mt-1">{verification.admin_note}</p>}
                </div>
              </div>
            )}

            <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cost</span>
              <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" />{cost} Sparks</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Your balance</span>
              <span className={`font-bold ${insufficient ? "text-destructive" : ""}`}>{balance} Sparks</span>
            </div>

            <div className="grid gap-2">
              {SLOTS.map((s) => {
                const Icon = s.icon;
                const preview = previews[s.kind];
                return (
                  <div key={s.kind} className="rounded-xl border p-2 flex items-center gap-3">
                    <input
                      ref={(el) => (inputs.current[s.kind] = el)}
                      type="file"
                      accept="image/*"
                      capture={s.kind === "selfie" ? "user" : "environment"}
                      hidden
                      onChange={(e) => pick(s.kind, e.target.files?.[0] || null)}
                    />
                    <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <Icon className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{s.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{s.hint}</p>
                    </div>
                    {preview ? (
                      <Button size="sm" variant="ghost" onClick={() => { setFiles((f) => { const c = { ...f }; delete c[s.kind]; return c; }); setPreviews((p) => { const c = { ...p }; delete c[s.kind]; return c; }); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => inputs.current[s.kind]?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-1" /> Upload
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <ul className="space-y-1 text-[11px] text-muted-foreground">
              <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-success shrink-0 mt-0.5" />CNIC and selfie are stored privately, admin-only.</li>
              <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-success shrink-0 mt-0.5" />Sparks are deducted on submission.</li>
              <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-success shrink-0 mt-0.5" />Badge appears across all your listings once approved.</li>
            </ul>

            <Button
              onClick={handleSubmit}
              disabled={submitting || insufficient || !allUploaded}
              className="w-full"
              size="lg"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> :
                insufficient ? "Insufficient Sparks" :
                !allUploaded ? "Upload all 3 images" :
                "Submit for verification"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
