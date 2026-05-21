import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Sparkles, Loader2, CheckCircle2, AlertCircle, ScanLine, Copy } from "lucide-react";
import { useMyVerification, useVerificationSettings } from "@/hooks/useVerification";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { startVerification, submitVerification, createDiditSession, getDiditDecision, fetchDiditEvidence } from "@/services/verificationService";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };
const PENDING_KEY = "didit_pending_session";

export default function VerificationDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { balance } = useWallet();
  const { data: verification, refetch } = useMyVerification(user?.id);
  const { data: settings } = useVerificationSettings();
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<number | null>(null);

  const cost = settings?.sparks_cost ?? 500;
  const insufficient = balance < cost;
  const status = verification?.status ?? "none";

  useEffect(() => { if (open) refetch(); }, [open, refetch]);
  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  const finalize = async (sessionId: string, sessionToken: string | null) => {
    await submitVerification(sessionId, sessionToken);
    try { await fetchDiditEvidence(sessionId); } catch (e) { console.error("evidence fetch failed", e); }
    sessionStorage.removeItem(PENDING_KEY);
    toast.success("Verification submitted for admin approval");
    refetch();
  };

  const startPolling = (sessionId: string, sessionToken: string | null) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const d = await getDiditDecision(sessionId);
        const st = String(d?.status || "").toLowerCase();
        if (["approved", "in review", "in_review", "declined", "completed"].some(x => st.includes(x))) {
          window.clearInterval(pollRef.current!);
          pollRef.current = null;
          await finalize(sessionId, sessionToken);
        }
      } catch { /* keep polling */ }
    }, 5000);
  };

  // Resume polling and finalize on return from Didit callback
  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw) as { session_id: string; session_token: string | null };
      const params = new URLSearchParams(window.location.search);
      if (params.get("verification") === "complete") {
        (async () => {
          try { await finalize(s.session_id, s.session_token); }
          catch { startPolling(s.session_id, s.session_token); }
        })();
        // clean query
        const url = new URL(window.location.href);
        url.searchParams.delete("verification");
        window.history.replaceState({}, "", url.toString());
      } else {
        startPolling(s.session_id, s.session_token);
      }
    } catch { sessionStorage.removeItem(PENDING_KEY); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAndRedirect = async () => {
    if (!user) return;
    if (insufficient) return toast.error(`Need ${cost} Sparks. Top up first.`);
    setLoading(true);
    try {
      await startVerification();
      const s = await createDiditSession();
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ session_id: s.session_id, session_token: s.session_token }));
      // Full-page redirect — Didit's COOP blocks popups/iframes
      window.location.href = s.url;
    } catch (e: any) {
      toast.error(e?.message || "Failed to start verification");
      setLoading(false);
    }
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
            Real-time ID scan + face match powered by Didit.
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
              Didit completed. An admin will approve shortly.
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

            <ul className="space-y-1 text-[11px] text-muted-foreground">
              <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-success shrink-0 mt-0.5" />You'll be redirected to Didit to scan your ID and face.</li>
              <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-success shrink-0 mt-0.5" />Sparks are deducted on submission.</li>
              <li className="flex gap-2"><CheckCircle2 className="h-3 w-3 text-success shrink-0 mt-0.5" />Final approval by our admins after Didit passes.</li>
            </ul>

            <Button onClick={startAndRedirect} disabled={loading || insufficient} className="w-full" size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> :
                insufficient ? "Insufficient Sparks" :
                <><ScanLine className="h-4 w-4 mr-2" /> Start ID scan</>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
