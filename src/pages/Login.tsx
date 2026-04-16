import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import logoImg from "@/assets/logo.png";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";
import SocialAuthButtons from "@/components/SocialAuthButtons";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (error) {
      setLoading(false);
      toast.error(getAuthErrorMessage(error));
      return;
    }

    setLoading(false);
    toast.success("Logged in successfully!");

    const redirect = searchParams.get("redirect") || "/";
    navigate(redirect, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-[hsl(var(--gradient-end))]/5 blur-3xl" />

      <div className="w-full max-w-md relative">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src={logoImg} alt="Near Konnect" className="h-12 object-contain" />
        </Link>

        <div className="glass rounded-2xl p-6 md:p-8 shadow-premium">
          <h1 className="text-2xl font-bold text-card-foreground mb-1">{t("login.welcomeBack")}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t("login.subtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">{t("login.email")}</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div>
              <Label htmlFor="password">{t("login.password")}</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-md h-11 rounded-xl font-semibold" type="submit" disabled={loading}>
              {loading ? t("login.submitting") : t("login.submit")}
            </Button>
          </form>

          <SocialAuthButtons disabled={loading} />

          <div className="text-center mt-4">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot your password?
            </Link>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("login.noAccount")}{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">{t("nav.signUp")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;