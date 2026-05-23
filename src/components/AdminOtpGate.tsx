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
  const [stage, setStage] = useState<"idle" | "sent">("idle");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) { if (mounted) setChecking(false); return; }
      const { data, error } = await supabase.functions.invoke("admin-session-check", { body: { token } });
      if (!mounted) return;
      if (!error && data?.valid) setUnlocked(true);
      else sessionStorage.removeItem(TOKEN_KEY);
      setChecking(false);
    })();
    return () => { mounted = false; };
  }, []);

  const sendCode = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-otp-send", {});
    setSending(false);
    if (error || !data?.ok) {
      toast({ title: "Could not send code", description: (data as any)?.error || error?.message || "Try again", variant: "destructive" });
      return;
    }
    const email = data.email as string;
    setMaskedEmail(email.replace(/(.{2}).*(@.*)/, "$1***$2"));
    setStage("sent");
    toast({ title: "Code sent", description: "Check your email for a 6-digit code." });
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("admin-otp-verify", { body: { code } });
    setVerifying(false);
    if (error || !data?.ok) {
      toast({ title: "Verification failed", description: (data as any)?.error || error?.message || "Try again", variant: "destructive" });
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, data.token);
    setUnlocked(true);
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
            For your security, confirm with a one-time code emailed to the admin address before opening the panel.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {stage === "idle" ? (
            <Button className="w-full" onClick={sendCode} disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send code to my email
            </Button>
          ) : (
            <>
              <p className="text-xs text-muted-foreground text-center">Code sent to {maskedEmail}</p>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-lg tracking-[0.5em]"
              />
              <Button className="w-full" onClick={verify} disabled={verifying}>
                {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verify & unlock
              </Button>
              <Button variant="ghost" className="w-full" onClick={sendCode} disabled={sending}>
                Resend code
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
