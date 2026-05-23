import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { ShieldCheck, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TOKEN_KEY = "nk_admin_otp_token";

export const clearAdminOtpSession = () => {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
};

const AdminOtpGate = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (token) {
        const { data, error } = await supabase.functions.invoke("admin-session-check", { body: { token } });
        if (mounted && !error && data?.valid) {
          setUnlocked(true);
          setChecking(false);
          return;
        }
        sessionStorage.removeItem(TOKEN_KEY);
      }
      const { data: st } = await supabase.functions.invoke("admin-pin-status", {});
      if (!mounted) return;
      setHasPin(!!st?.hasPin);
      setChecking(false);
    })();
    return () => { mounted = false; };
  }, []);

  const verify = async () => {
    if (!/^\d{4,8}$/.test(pin)) {
      toast({ title: "Enter your 4-8 digit PIN", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-pin-verify", { body: { pin } });
    setBusy(false);
    if (error || !data?.ok) {
      toast({ title: "Verification failed", description: (data as any)?.error || error?.message || "Try again", variant: "destructive" });
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, data.token);
    setUnlocked(true);
  };

  const createPin = async () => {
    if (!/^\d{4,8}$/.test(newPin)) {
      toast({ title: "PIN must be 4-8 digits", variant: "destructive" });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: "PINs do not match", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-pin-set", { body: { new_pin: newPin } });
    setBusy(false);
    if (error || !data?.ok) {
      toast({ title: "Could not set PIN", description: (data as any)?.error || error?.message || "Try again", variant: "destructive" });
      return;
    }
    toast({ title: "PIN set", description: "Enter your new PIN to continue." });
    setHasPin(true);
    setNewPin("");
    setConfirmPin("");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-full bg-primary/10 p-3 mb-4">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Admin verification</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {hasPin
              ? "Enter your admin PIN to access the panel."
              : "Set a secure admin PIN. You'll use this PIN every time you open the admin panel."}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {hasPin ? (
            <>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="text-center text-lg tracking-[0.5em]"
                onKeyDown={(e) => { if (e.key === "Enter") verify(); }}
              />
              <Button className="w-full" onClick={verify} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Unlock
              </Button>
            </>
          ) : (
            <>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                placeholder="New PIN (4-8 digits)"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                className="text-center tracking-[0.4em]"
              />
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                className="text-center tracking-[0.4em]"
              />
              <Button className="w-full" onClick={createPin} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Set PIN
              </Button>
            </>
          )}
          <Button variant="outline" className="w-full" onClick={() => { clearAdminOtpSession(); signOut(); }}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminOtpGate;
