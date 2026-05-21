import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useMyVerification, useStartAndSubmitVerification, useVerificationSettings } from "@/hooks/useVerification";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "sonner";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export default function VerificationDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { balance } = useWallet();
  const { data: verification, refetch } = useMyVerification(user?.id);
  const { data: settings } = useVerificationSettings();
  const startMutation = useStartAndSubmitVerification();
  const [launched, setLaunched] = useState<{ inquiryId: string; demo: boolean } | null>(null);

  const cost = settings?.sparks_cost ?? 500;
  const insufficient = balance < cost;
  const status = verification?.status ?? "none";

  useEffect(() => { if (open) refetch(); }, [open, refetch]);

  const handleStart = async () => {
    if (insufficient) { toast.error(`Need ${cost} Sparks. Top up first.`); return; }
    try {
      const res = await startMutation.mutateAsync();
      setLaunched({ inquiryId: res.inquiry.inquiry_id, demo: res.inquiry.demo });
      if (!res.inquiry.demo && res.inquiry.session_token) {
        // Persona web SDK launch (loaded lazily)
        try {
          const { default: Persona } = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/persona@5.1.7/+esm" as any);
          const client = new (Persona as any).Client({
            templateId: res.inquiry.template_id,
            inquiryId: res.inquiry.inquiry_id,
            sessionToken: res.inquiry.session_token,
            onComplete: () => { toast.success("Verification submitted. Awaiting review."); refetch(); },
          });
          client.open();
        } catch (e) {
          toast.message("Verification submitted — awaiting Persona webhook.");
        }
      } else {
        toast.success("Verification submitted in demo mode. Awaiting admin review.");
      }
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/30">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">Verified Worker Badge</DialogTitle>
          <DialogDescription className="text-center">
            Lifetime trust badge across your profile, cards, and ads. One-time KYC via Persona.
          </DialogDescription>
        </DialogHeader>

        {status === "approved" ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="font-bold">You're verified</p>
            <p className="text-xs text-muted-foreground">Badge active since {new Date(verification!.verified_at!).toLocaleDateString()}</p>
          </div>
        ) : status === "submitted" ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-bold">Under review</p>
            <p className="text-xs text-center text-muted-foreground">We're verifying your documents. You'll be notified when approved.</p>
          </div>
        ) : status === "rejected" || status === "resubmit" ? (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">{status === "rejected" ? "Rejected" : "Resubmission required"}</p>
                {verification?.admin_note && <p className="text-xs text-muted-foreground mt-1">{verification.admin_note}</p>}
              </div>
            </div>
            <Button onClick={handleStart} disabled={startMutation.isPending || insufficient} className="w-full">
              {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Re-submit verification"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cost</span>
                <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" />{cost} Sparks</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your balance</span>
                <span className={`font-bold ${insufficient ? "text-destructive" : ""}`}>{balance} Sparks</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Validity</span>
                <span className="font-bold">Lifetime</span>
              </div>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />Government ID + selfie verified via Persona</li>
              <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />Badge appears across all your listings</li>
              <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />Documents stored privately, admin-only</li>
            </ul>
            <Button onClick={handleStart} disabled={startMutation.isPending || insufficient} className="w-full" size="lg">
              {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : insufficient ? "Insufficient Sparks" : "Start verification"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
