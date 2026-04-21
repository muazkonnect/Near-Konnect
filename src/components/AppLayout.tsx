import { Link, useLocation, useNavigate } from "react-router-dom";
import { Compass, HeartPulse, Home, LogOut, MapPin, MessageSquare, Search, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import logoImg from "@/assets/logo.svg";

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
    { label: "Blood Konnect", to: "/blood-donors", icon: HeartPulse, emphasis: true },
    { label: "Messages", to: "/messages", icon: MessageSquare },
    { label: "Profile", to: profilePath, icon: UserRound },
  ];

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "You";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* MOBILE: dark hero header */}
      <div className="md:hidden">
        {title ? (
          <div className="relative overflow-hidden bg-hero text-hero-foreground rounded-b-[2rem] px-5 pt-7 pb-8 my-0">
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

        <main className="px-4 pt-5 my-[50px]">{children}</main>

        {user && showSignOut && (
          <div className="px-4 pb-32 pt-6 flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
              <span aria-hidden>·</span>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <span aria-hidden>·</span>
              <Link to="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link>
            </div>
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

      {/* DESKTOP: top navigation + dark hero card */}
      <div className="mx-auto hidden max-w-[1200px] flex-col md:flex md:px-4 md:py-6 md:gap-5">
        <header className="sticky top-4 z-30 flex items-center gap-4 rounded-full bg-hero text-hero-foreground px-4 py-2.5 shadow-premium relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <Link to="/" className="relative flex shrink-0 items-center pl-2 pr-3">
            <img src={logoImg} alt="NearKonnect" className="h-8 object-contain" />
          </Link>

          <nav className="relative flex flex-1 items-center justify-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-hero-muted hover:bg-white/10 hover:text-hero-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="relative flex shrink-0 items-center gap-2">
            <button
              onClick={() => navigate(profilePath)}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-hero-foreground transition-colors hover:bg-white/15"
              aria-label="Open dashboard"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-xs">
                {firstName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden lg:inline">{firstName}</span>
            </button>
            {user && (
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-hero-muted transition-colors hover:bg-destructive hover:text-destructive-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            )}
          </div>
        </header>

        <div className="min-w-0 flex-1 space-y-5">
          <button
            onClick={() => navigate("/discover")}
            className="flex w-full items-center gap-2 rounded-full bg-card px-5 py-3 text-left text-sm text-muted-foreground shadow-premium hover:bg-muted/60"
          >
            <Search className="h-4 w-4" /> Find help near you...
          </button>

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