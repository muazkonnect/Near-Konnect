import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import FaceVerification from "./FaceVerification";

type Status = "none" | "pending" | "approved" | "denied" | "consumed";

const AvatarResetFlow = ({ onReplaced }: { onReplaced?: (url: string) => void }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("none");
  const [reason, setReason] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("avatar_reset_requests")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["pending", "approved", "denied"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setStatus((data?.status as Status) || "none");
  };

  useEffect(() => { load(); }, [user?.id]);

  const submitRequest = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from("avatar_reset_requests")
      .insert({ user_id: user.id, reason: reason.trim(), status: "pending" });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Request sent to admins");
    setAskOpen(false);
    setReason("");
    setStatus("pending");
  };

  const onVerified = async (dataUrl: string) => {
    if (!user) return;
    const { data, error } = await supabase.functions.invoke("set-verified-avatar", {
      body: { userId: user.id, imageBase64: dataUrl },
    });
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Upload failed");
      return;
    }
    toast.success("New profile photo saved");
    setCaptureOpen(false);
    setStatus("consumed");
    if (data?.avatar_url) onReplaced?.(data.avatar_url);
  };

  return (
    <div className="mt-2">
      {status === "none" || status === "denied" || status === "consumed" ? (
        <Button size="sm" variant="outline" onClick={() => setAskOpen(true)}>
          Request photo change
        </Button>
      ) : status === "pending" ? (
        <p className="text-xs text-muted-foreground">Photo change pending admin approval…</p>
      ) : (
        <Button size="sm" onClick={() => setCaptureOpen(true)}>
          Verify new face to replace photo
        </Button>
      )}

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request profile photo change</DialogTitle>
            <DialogDescription>
              Tell admins why you need a new photo. If approved, you'll re-do face verification.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAskOpen(false)}>Cancel</Button>
            <Button onClick={submitRequest} disabled={submitting}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={captureOpen} onOpenChange={setCaptureOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify your face</DialogTitle>
            <DialogDescription>
              This captured photo will become your new permanent profile picture.
            </DialogDescription>
          </DialogHeader>
          <FaceVerification verifiedDataUrl={null} onVerified={(dataUrl) => onVerified(dataUrl)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvatarResetFlow;
