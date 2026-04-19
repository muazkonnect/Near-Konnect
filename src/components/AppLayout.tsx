import { Link, useLocation, useNavigate } from "react-router-dom";
import { Compass, HeartPulse, Home, LogOut, MapPin, MessageSquare, Search, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  showSignOut?: boolean;
}

const AppLayout = ({ title, subtitle, action, children, showSignOut = false }: AppLayoutProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role } = useUserRole();

  const profilePath = role === "worker" ? "/worker-dashboard" : role === "admin" ? "/admin" : "/dashboard";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    { label: "Home", to: "/", icon: Home },
    { label: "Explore", to: "/discover", icon: Compass },
    { label: "Requests", to: "/blood-donors", icon: HeartPulse, emphasis: true },
    { label: "Messages", to: "/messages", icon: MessageSquare },
    { label: "Profile", to: profilePath, icon: UserRound },
  ];

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "You";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* MOBILE: dark hero header */}
      <div className="md:hidden">
        {title ? (
          <div className="relative overflow-hidden bg-hero text-hero-foreground rounded-b-[2rem] px-5 pt-7 pb-8">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div className="relative flex items-center justify-between">
              <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                <span>NearKonnect</span>
              </Link>
            </div>

            <div className="relative mt-6 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                {subtitle && <p className="mt-1.5 text-sm text-hero-muted line-clamp-2">{subtitle}</p>}
              </div>
              {action && <div className="shrink-0">{action}</div>}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" />
              <span>NearKonnect</span>
            </Link>
          </div>
        )}

        <main className="px-4 pt-5">{children}</main>

        {user && showSignOut && (
          <div className="px-4 pb-32 pt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="gap-2 rounded-full border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        )}
      </div>

      {/* DESKTOP: sidebar + dark hero card */}
      <div className="mx-auto hidden max-w-[1200px] md:flex md:gap-6 md:px-4 md:py-6">
        <aside className="sticky top-6 flex h-[calc(100vh-3rem)] w-64 flex-col rounded-3xl bg-hero text-hero-foreground p-4 py-[18px] my-0">
// ... keep existing code
            <button
              onClick={handleSignOut}
              className="mt-2 w-full gap-3 rounded-full px-4 text-sm font-semibold text-hero-muted transition-colors hover:bg-destructive hover:text-destructive-foreground py-[12px] my-[460px] flex items-center justify-start"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          )}
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex items-center gap-3 rounded-full bg-card px-3 py-2 shadow-premium">
            <button
              onClick={() => navigate("/discover")}
              className="flex flex-1 items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted/80"
            >
              <Search className="h-4 w-4" /> Find help near you...
            </button>

            <button
              onClick={() => navigate(profilePath)}
              className="inline-flex items-center gap-2 rounded-full bg-hero px-3 py-2 text-sm font-semibold text-hero-foreground transition-colors hover:bg-hero/90"
              aria-label="Open dashboard"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-xs">
                {firstName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{firstName}</span>
            </button>
          </div>

          {title && (
            <div className="relative overflow-hidden bg-hero text-hero-foreground rounded-3xl px-8 py-7 flex flex-wrap items-start justify-between gap-3">
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <div className="relative min-w-0">
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                {subtitle && <p className="mt-2 text-sm text-hero-muted">{subtitle}</p>}
              </div>
              {action && <div className="relative">{action}</div>}
            </div>
          )}

          <main className={title ? "rounded-3xl bg-card p-6" : ""}>{children}</main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
