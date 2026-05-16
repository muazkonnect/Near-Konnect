import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, User, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";
import logoImg from "@/assets/logo.svg";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

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
    toast.success("Logged in successfully.");
    const redirect = searchParams.get("redirect") || "/";
    navigate(redirect, { replace: true });
  };


  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-hero text-hero-foreground">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -right-[10%] -top-[10%] h-[300px] w-[300px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[5%] -left-[5%] h-[250px] w-[250px] rounded-full bg-hero-foreground/5 blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-grow flex-col items-center justify-center px-5 py-20 md:px-16">
        {/* Brand */}
        <div className="mb-12 flex w-full flex-col items-center text-center">
          <img src={logoImg} alt="Near Konnect" className="mb-6 h-12 object-contain" />
          <h1 className="text-[32px] font-semibold leading-10 tracking-tight text-hero-foreground">Welcome Back</h1>
          <p className="mt-1 text-base text-hero-muted">Access your premium hyperlocal community</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full space-y-6 rounded-xl border border-hero-foreground/10 bg-hero-foreground/5/80 p-6 backdrop-blur-md"
        >
          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="ml-1 text-[12px] font-semibold uppercase tracking-wider text-hero-muted">
              Email Address or Phone Number
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-6 h-5 w-5 text-hero-muted/50" />
              <input
                id="email"
                type="text"
                placeholder="Enter your contact info"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 w-full rounded-lg border-b border-hero-foreground/20/20 bg-hero-foreground/5 pl-14 pr-6 text-base text-hero-foreground placeholder:text-hero-muted/60 outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-1">
              <label htmlFor="password" className="text-[12px] font-semibold uppercase tracking-wider text-hero-muted">
                Password
              </label>
              <Link to="/forgot-password" className="text-[12px] font-semibold text-primary hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-6 h-5 w-5 text-hero-muted/50" />
              <input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPwError(null); }}
                className={`h-14 w-full rounded-lg border-b bg-hero-foreground/5 pl-14 pr-14 text-base text-hero-foreground placeholder:text-hero-muted/60 outline-none transition-colors focus:border-primary ${pwError ? "border-[#ffb4ab]" : "border-hero-foreground/20/20"}`}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-6 text-hero-muted/50 transition-colors hover:text-hero-foreground"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {pwError && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#ffb4ab]">
                <AlertCircle className="h-3.5 w-3.5" /> {pwError}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[18px] font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <>
                Log In
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

        </form>

        {/* Footer link */}
        <div className="mt-12 text-center">
          <p className="text-base text-hero-muted">
            Don't have an account?
            <Link to="/register" className="ml-1 font-bold text-primary transition-all hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </main>

    </div>
  );
};

export default Login;
