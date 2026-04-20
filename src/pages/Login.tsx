import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";
import SocialAuthButtons from "@/components/SocialAuthButtons";
import AuthShell from "@/components/AuthShell";
import AuthTabs from "@/components/AuthTabs";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (error) {
      setLoading(false);
      const msg = getAuthErrorMessage(error);
      if (/password|credentials/i.test(msg)) setPwError("Incorrect password");
      else toast.error(msg);
      return;
    }

    setLoading(false);
    toast.success("Logged in. Please verify your face to continue.");
    const redirect = searchParams.get("redirect") || "/";
    // Always require face re-verification on every login (compares against stored image)
    navigate(`/verify-face?redirect=${encodeURIComponent(redirect)}&force=1`, { replace: true });
  };

  return (
    <AuthShell
      title={t("login.welcomeBack")}
      subtitle={t("login.subtitle")}
      heroExtra={<AuthTabs active="login" />}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <Label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email or Phone
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-2xl border-border bg-background pr-10 text-base"
            />
            {emailValid && (
              <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-success" />
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError(null); }}
              className={`h-12 rounded-2xl pr-10 text-base ${pwError ? "border-destructive" : "border-border"} bg-background`}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {pwError && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {pwError}
            </p>
          )}
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" disabled={loading} variant="hero" size="lg" className="w-full">
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Logging in...
            </>
          ) : (
            t("login.submit")
          )}
        </Button>
      </form>

      <SocialAuthButtons disabled={loading} />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("login.noAccount")}{" "}
        <Link to="/register" className="font-semibold text-foreground hover:underline">
          {t("nav.signUp")}
        </Link>
      </p>
    </AuthShell>
  );
};

export default Login;
