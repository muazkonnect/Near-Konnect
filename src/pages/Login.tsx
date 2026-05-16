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

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setLoading(false);
      toast.error(getAuthErrorMessage(error));
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-[#131313] text-[#e5e2e1]">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -right-[10%] -top-[10%] h-[300px] w-[300px] rounded-full bg-[#d9ff7a]/5 blur-[120px]" />
        <div className="absolute -bottom-[5%] -left-[5%] h-[250px] w-[250px] rounded-full bg-[#c8c6c5]/5 blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-grow flex-col items-center justify-center px-5 py-20 md:px-16">
        {/* Brand */}
        <div className="mb-12 flex w-full flex-col items-center text-center">
          <img src={logoImg} alt="Near Konnect" className="mb-6 h-12 object-contain" />
          <h1 className="text-[32px] font-semibold leading-10 tracking-tight text-[#e5e2e1]">Welcome Back</h1>
          <p className="mt-1 text-base text-[#c4c7c7]">Access your premium hyperlocal community</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full space-y-6 rounded-xl border border-[#e5e2e1]/10 bg-[#1a1a1a]/80 p-6 backdrop-blur-md"
        >
          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="ml-1 text-[12px] font-semibold uppercase tracking-wider text-[#c4c7c7]">
              Email Address or Phone Number
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-6 h-5 w-5 text-[#c4c7c7]/50" />
              <input
                id="email"
                type="text"
                placeholder="Enter your contact info"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 w-full rounded-lg border-b border-[#444748]/20 bg-[#1c1b1b] pl-14 pr-6 text-base text-[#e5e2e1] placeholder:text-[#c4c7c7]/60 outline-none transition-colors focus:border-[#d9ff7a]"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-1">
              <label htmlFor="password" className="text-[12px] font-semibold uppercase tracking-wider text-[#c4c7c7]">
                Password
              </label>
              <Link to="/forgot-password" className="text-[12px] font-semibold text-[#d9ff7a] hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-6 h-5 w-5 text-[#c4c7c7]/50" />
              <input
                id="password"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPwError(null); }}
                className={`h-14 w-full rounded-lg border-b bg-[#1c1b1b] pl-14 pr-14 text-base text-[#e5e2e1] placeholder:text-[#c4c7c7]/60 outline-none transition-colors focus:border-[#d9ff7a] ${pwError ? "border-[#ffb4ab]" : "border-[#444748]/20"}`}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-6 text-[#c4c7c7]/50 transition-colors hover:text-[#e5e2e1]"
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
            className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#d9ff7a] text-[18px] font-semibold text-[#273500] shadow-lg shadow-[#d9ff7a]/15 transition-all active:scale-[0.98] disabled:opacity-60"
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

          {/* Divider */}
          <div className="flex items-center gap-6 py-2">
            <div className="h-px flex-grow bg-[#444748]/20" />
            <span className="whitespace-nowrap text-[12px] font-semibold uppercase tracking-wider text-[#c4c7c7]">
              Or continue with
            </span>
            <div className="h-px flex-grow bg-[#444748]/20" />
          </div>

          {/* Socials */}
          <div className="grid grid-cols-2 gap-6">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="flex h-14 items-center justify-center gap-2 rounded-lg border border-[#444748]/30 text-[#e5e2e1] transition-colors hover:bg-[#2a2a2a]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M21.35 11.1H12v2.8h5.35c-.23 1.36-1.7 4-5.35 4-3.22 0-5.85-2.66-5.85-5.9s2.63-5.9 5.85-5.9c1.83 0 3.06.78 3.76 1.45l2.56-2.46C16.86 3.6 14.66 2.6 12 2.6 6.96 2.6 2.9 6.66 2.9 11.7s4.06 9.1 9.1 9.1c5.26 0 8.74-3.7 8.74-8.9 0-.6-.07-1.06-.17-1.5z"/>
              </svg>
              <span className="text-sm font-medium">Google</span>
            </button>
            <button
              type="button"
              disabled
              className="flex h-14 items-center justify-center gap-2 rounded-lg border border-[#444748]/30 text-[#e5e2e1] opacity-60 transition-colors hover:bg-[#2a2a2a]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.49 0-2.534-1.27-3.508-2.61-1.984-2.69-3.5-7.63-1.464-10.91 1.012-1.63 2.822-2.66 4.762-2.69 1.464-.03 2.846.98 3.74.98.893 0 2.574-1.21 4.34-1.03.741.03 2.82.3 4.158 2.24-.108.072-2.48 1.45-2.456 4.32.024 3.41 2.997 4.55 3.026 4.56z"/>
              </svg>
              <span className="text-sm font-medium">Apple</span>
            </button>
          </div>
        </form>

        {/* Footer link */}
        <div className="mt-12 text-center">
          <p className="text-base text-[#c4c7c7]">
            Don't have an account?
            <Link to="/register" className="ml-1 font-bold text-[#d9ff7a] transition-all hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 flex justify-center border-t border-[#444748]/5 px-5 py-6">
        <div className="flex items-center gap-12 text-[#c4c7c7]/40">
          <Link to="/legal/privacy" className="text-[12px] font-semibold uppercase tracking-wider transition-colors hover:text-[#e5e2e1]">
            Privacy Policy
          </Link>
          <span className="h-1 w-1 rounded-full bg-[#444748]/30" />
          <Link to="/legal/terms" className="text-[12px] font-semibold uppercase tracking-wider transition-colors hover:text-[#e5e2e1]">
            Terms of Service
          </Link>
          <span className="h-1 w-1 rounded-full bg-[#444748]/30" />
          <Link to="/help" className="text-[12px] font-semibold uppercase tracking-wider transition-colors hover:text-[#e5e2e1]">
            Help Center
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Login;
