import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";
import AuthShell from "@/components/AuthShell";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) { toast.error("Please enter your email address."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(getAuthErrorMessage(error)); return; }
    setSent(true);
    toast.success("Password reset email sent!");
  };

  return (
    <AuthShell
      title={sent ? "Check Your Email" : "Forgot Password?"}
      subtitle={sent
        ? `We've sent a password reset link to ${email}. Click it to reset your password.`
        : "Enter your email and we'll send you a link to reset your password."}
    >
      {sent ? (
        <div className="space-y-4">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10">
            <Mail className="h-7 w-7 text-success" />
          </div>
          <Button variant="outline" className="w-full" onClick={() => setSent(false)}>Send Again</Button>
          <Link to="/login" className="block">
            <Button variant="hero" size="lg" className="w-full">Back to Login</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email Address</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-2xl border-border bg-background text-base" />
          </div>
          <Button type="submit" disabled={loading} variant="hero" size="lg" className="w-full">
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
          <Link to="/login" className="block text-center text-sm font-medium text-muted-foreground hover:text-foreground">
            Back to Login
          </Link>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
