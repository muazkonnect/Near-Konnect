import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";

interface SocialAuthButtonsProps {
  redirectTo?: string;
  disabled?: boolean;
}

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.42 2.22-1.27 3.04-.84.85-2.21 1.5-3.32 1.4-.13-1.09.43-2.23 1.21-3.02C13.83 1.96 15.27 1.36 16.365 1.43zm3.85 16.2c-.62 1.41-.92 2.04-1.72 3.28-1.12 1.74-2.7 3.91-4.66 3.93-1.74.02-2.18-1.13-4.54-1.12-2.36.01-2.85 1.14-4.59 1.12-1.96-.02-3.46-1.99-4.58-3.73C-2.2 16.7-2.51 11 .42 8.05c1.12-1.13 2.7-1.85 4.36-1.88 1.84-.04 3.59 1.24 4.54 1.24.95 0 3.07-1.53 5.16-1.31.88.04 3.34.36 4.92 2.7-4.31 2.36-3.61 8.49-1.18 10.83z"/>
  </svg>
);

export const SocialAuthButtons = ({ redirectTo, disabled }: SocialAuthButtonsProps) => {
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  const handle = async (provider: "google" | "apple") => {
    setLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: redirectTo ?? window.location.origin,
      });
      if (result.error) {
        toast.error(`Could not sign in with ${provider === "google" ? "Google" : "Apple"}.`);
        setLoading(null);
        return;
      }
      // result.redirected → browser is navigating away, do nothing
    } catch {
      toast.error("Sign-in failed. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-widest">
          <span className="bg-background px-3 font-semibold text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full gap-2 rounded-2xl border-border text-base"
        onClick={() => handle("google")}
        disabled={disabled || loading !== null}
      >
        {loading === "google" ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <GoogleIcon />
        )}
        Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full gap-2 rounded-2xl border-border text-base"
        onClick={() => handle("apple")}
        disabled={disabled || loading !== null}
      >
        {loading === "apple" ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <AppleIcon />
        )}
        Apple
      </Button>
    </div>
  );
};

export default SocialAuthButtons;
