import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Loader2, KeyRound } from "lucide-react";
import { clearAdminOtpSession } from "@/components/AdminOtpGate";

export default function AdminPinTab() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase.functions.invoke("admin-pin-status", {});
    setHasPin(!!data?.hasPin);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    if (!/^\d{4,8}$/.test(next)) {
      toast({ title: "PIN must be 4-8 digits", variant: "destructive" });
      return;
    }
    if (next !== confirm) {
      toast({ title: "PINs do not match", variant: "destructive" });
      return;
    }
    if (hasPin && !current) {
      toast({ title: "Enter your current PIN", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-pin-set", {
      body: hasPin ? { current_pin: current, new_pin: next } : { new_pin: next },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast({ title: "Could not update PIN", description: (data as any)?.error || error?.message || "Try again", variant: "destructive" });
      return;
    }
    toast({ title: hasPin ? "PIN updated" : "PIN created", description: "Existing admin sessions were signed out." });
    clearAdminOtpSession();
    setCurrent(""); setNext(""); setConfirm("");
    setHasPin(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-md space-y-4 rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Admin Access PIN</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        This PIN is required as a second verification step every time you open the admin panel.
        Use 4-8 digits. Changing the PIN signs out all existing admin sessions.
      </p>
      {hasPin && (
        <div className="space-y-1.5">
          <Label htmlFor="cur-pin">Current PIN</Label>
          <Input
            id="cur-pin" type="password" inputMode="numeric" maxLength={8}
            value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="new-pin">{hasPin ? "New PIN" : "PIN"}</Label>
        <Input
          id="new-pin" type="password" inputMode="numeric" maxLength={8}
          value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-pin">Confirm PIN</Label>
        <Input
          id="confirm-pin" type="password" inputMode="numeric" maxLength={8}
          value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <Button onClick={submit} disabled={busy} className="w-full">
        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {hasPin ? "Update PIN" : "Set PIN"}
      </Button>
    </div>
  );
}
