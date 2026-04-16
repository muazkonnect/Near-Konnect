import { Link, useLocation } from "react-router-dom";
import { Mail, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const HIDDEN_ROUTES = ["/login", "/register", "/verify-otp", "/forgot-password", "/reset-password"];

const UnverifiedEmailBanner = () => {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (loading || !user || user.email_confirmed_at || dismissed) return null;
  if (HIDDEN_ROUTES.some(r => pathname.startsWith(r))) return null;

  return (
    <div className="sticky top-0 z-40 w-full bg-amber-500/10 border-b border-amber-500/30 backdrop-blur">
      <div className="container mx-auto flex items-center gap-3 px-4 py-2 text-sm">
        <Mail className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="flex-1 text-foreground">
          Please verify your email to unlock bookings, messages, and posting.{" "}
          <Link
            to={`/verify-otp?email=${encodeURIComponent(user.email ?? "")}`}
            className="font-semibold text-primary hover:underline"
          >
            Verify now
          </Link>
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default UnverifiedEmailBanner;
