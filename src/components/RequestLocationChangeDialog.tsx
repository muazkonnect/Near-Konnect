import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import MapLocationPicker from "@/components/MapLocationPicker";
import type { Coords } from "@/lib/geolocation";
import { MapPin } from "lucide-react";

interface Props {
  workerUserId: string;
  currentLatitude: number | null;
  currentLongitude: number | null;
}

const RequestLocationChangeDialog = ({ workerUserId, currentLatitude, currentLongitude }: Props) => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<null | { status: string; created_at: string; admin_comment: string }>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadLatest = async () => {
    const { data } = await (supabase as any)
      .from("worker_location_change_requests")
      .select("status, created_at, admin_comment")
      .eq("worker_user_id", workerUserId)
      .order("created_at", { ascending: false })
      .limit(1);
    setPending(data?.[0] || null);
  };

  useEffect(() => { if (open) loadLatest(); }, [open]);

  const submit = async () => {
    if (!coords) { toast.error("Pin a new location on the map."); return; }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("worker_location_change_requests")
      .insert({
        worker_user_id: workerUserId,
        current_latitude: currentLatitude,
        current_longitude: currentLongitude,
        requested_latitude: coords.latitude,
        requested_longitude: coords.longitude,
        reason: reason.trim(),
        status: "pending",
      });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Request submitted. An admin will review it.");
    setReason(""); setCoords(null);
    loadLatest();
  };

  const hasPending = pending?.status === "pending";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MapPin className="h-4 w-4" /> Request location change
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request service location change</DialogTitle>
          <DialogDescription>
            Your service location is permanent. Submit a request and an admin will review and apply it.
          </DialogDescription>
        </DialogHeader>

        {pending && (
          <div className="rounded-md border bg-muted/30 p-2 text-xs">
            Latest request: <span className="font-medium">{pending.status}</span> ·{" "}
            {new Date(pending.created_at).toLocaleString()}
            {pending.admin_comment && <p className="mt-1">Admin: {pending.admin_comment}</p>}
          </div>
        )}

        <fieldset disabled={hasPending} className="space-y-3">
          <MapLocationPicker value={coords} onChange={setCoords} />
          <Textarea
            placeholder="Reason for the change…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          {hasPending && (
            <p className="text-xs text-amber-600">You already have a pending request. Please wait for the admin's decision.</p>
          )}
        </fieldset>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={submit} disabled={saving || hasPending || !coords}>
            {saving ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestLocationChangeDialog;
