import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PasswordStrength from "@/components/PasswordStrength";
import { validatePassword } from "@/lib/passwordValidation";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";
import AuthShell from "@/components/AuthShell";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    if (window.location.hash.includes("type=recovery")) setIsRecovery(true);
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords do not match."); return; }
    const pwValidation = validatePassword(password);
    if (!pwValidation.isValid) { toast.error("Password doesn't meet requirements: " + pwValidation.errors[0]); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(getAuthErrorMessage(error)); return; }
    toast.success("Password updated successfully!");
    navigate("/login", { replace: true });
  };

  if (!isRecovery) {
    return (
      <AuthShell title="Invalid Reset Link" subtitle="This link is invalid or has expired. Please request a new password reset.">
        <Link to="/forgot-password" className="block">
          <Button variant="hero" size="lg" className="w-full">Request New Link</Button>
        </Link>
      </AuthShell>
    );
  }

  const inputClass = "h-12 rounded-2xl border-border bg-background pr-10 text-base";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <AuthShell title="Set New Password" subtitle="Enter your new password below.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="password" className={labelClass}>New Password</Label>
          <div className="relative">
            <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>
        <div>
          <Label htmlFor="confirmPassword" className={labelClass}>Confirm New Password</Label>
          <Input id="confirmPassword" type={showPw ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 rounded-2xl border-border bg-background text-base" />
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-2 text-xs font-medium text-destructive">Passwords do not match</p>
          )}
        </div>
        <Button type="submit" disabled={loading || password !== confirmPassword} variant="hero" size="lg" className="w-full">
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;
