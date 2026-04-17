import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";
import logoImg from "@/assets/logo.png";

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

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // No email — bounce back to register
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

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    setLoading(false);
    if (error) {
      submittedRef.current = false;
      setCode("");
      toast.error(getAuthErrorMessage(error) || "Invalid or expired code.");
      return;
    }

    toast.success("Email verified! Welcome to Near Konnect.");
    navigate(redirect, { replace: true });
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && !loading) void handleVerify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResending(false);
    if (error) {
      toast.error(getAuthErrorMessage(error));
      return;
    }
    toast.success("New code sent. Check your inbox.");
    setCooldown(RESEND_COOLDOWN);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-[hsl(var(--gradient-end))]/5 blur-3xl" />

      <div className="w-full max-w-md relative">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src={logoImg} alt="Near Konnect" className="h-12 object-contain" />
        </Link>

        <div className="glass rounded-2xl p-6 md:p-8 shadow-premium">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-card-foreground mb-1">Verify your email</h1>
            <p className="text-sm text-muted-foreground mb-3">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{email}</span>
            </p>
            <p className="text-xs text-muted-foreground/90 bg-muted/50 border border-border rounded-md px-3 py-2 mb-6">
              Don't see it? Check your <span className="font-medium text-foreground">Spam</span> or{" "}
              <span className="font-medium text-foreground">Promotions</span> folder.
            </p>

            <div className="mb-6">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={setCode}
                disabled={loading}
                autoFocus
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <InputOTPSlot key={i} index={i} className="w-11 h-12 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Verifying…
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="text-primary"
            >
              {resending
                ? "Sending…"
                : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : "Resend code"}
            </Button>

            <p className="text-xs text-muted-foreground mt-6">
              Wrong email?{" "}
              <Link to="/register" className="text-primary font-medium hover:underline">
                Sign up again
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
