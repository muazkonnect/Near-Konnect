import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";
import AuthShell from "@/components/AuthShell";

const RESEND_COOLDOWN = 45;
const OTP_LENGTH = 8;

const VerifyOtp = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const emailFromUrl = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const email = emailFromUrl || user?.email || "";
  const redirect = searchParams.get("redirect") || "/";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!email) {
      toast.error("Missing email. Please sign up again.");
      navigate("/register", { replace: true });
    }
  }, [email, navigate]);

  const handleVerify = async (token: string) => {
    if (submittedRef.current || !email) return;
    submittedRef.current = true;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
    setLoading(false);
    if (error) {
      submittedRef.current = false;
      setCode("");
      toast.error(getAuthErrorMessage(error) || "Invalid or expired code.");
      return;
    }
    toast.success("Email verified!");
    navigate(redirect, { replace: true });
  };

  useEffect(() => {
    if (code.length === OTP_LENGTH && !loading) void handleVerify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) { toast.error(getAuthErrorMessage(error)); return; }
    toast.success("New code sent. Check your inbox.");
    setCooldown(RESEND_COOLDOWN);
  };

  return (
    <AuthShell title="Verify your email" subtitle={`We sent an ${OTP_LENGTH}-character code to ${email}`}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/15">
          <Mail className="h-6 w-6 text-foreground" />
        </div>
        <p className="mb-6 rounded-2xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Don't see it? Check your <span className="font-semibold text-foreground">Spam</span> or{" "}
          <span className="font-semibold text-foreground">Promotions</span> folder.
        </p>

        <div className="mb-6">
          <InputOTP
            maxLength={OTP_LENGTH}
            value={code}
            onChange={(v) => setCode(v.toUpperCase())}
            disabled={loading}
            autoFocus
            pattern="^[A-Za-z0-9]*$"
          >
            <InputOTPGroup>
              {Array.from({ length: OTP_LENGTH }, (_, i) => (
                <InputOTPSlot key={i} index={i} className="h-12 w-9 rounded-xl text-base" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {loading && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            Verifying…
          </div>
        )}

        <Button type="button" variant="ghost" size="sm" onClick={handleResend} disabled={resending || cooldown > 0}>
          {resending ? "Sending…" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </Button>

        <p className="mt-6 text-xs text-muted-foreground">
          Wrong email?{" "}
          <Link to="/register" className="font-semibold text-foreground hover:underline">Sign up again</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default VerifyOtp;
