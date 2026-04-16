import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";
import { getAuthErrorMessage } from "@/lib/supabaseErrorMessages";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast.error(getAuthErrorMessage(error));
      return;
    }

    setSent(true);
    toast.success("Password reset email sent!");
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
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-2xl font-bold text-card-foreground mb-2">Check Your Email</h1>
              <p className="text-sm text-muted-foreground mb-6">
                We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
              </p>
              <Button variant="outline" onClick={() => setSent(false)} className="mr-2">
                Send Again
              </Button>
              <Link to="/login">
                <Button className="bg-gradient-brand text-primary-foreground hover:opacity-90">
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-card-foreground mb-1">Forgot Password?</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-md h-11 rounded-xl font-semibold"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary mt-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
