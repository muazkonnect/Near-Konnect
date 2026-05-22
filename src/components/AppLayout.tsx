import { Link, useLocation, useNavigate } from "react-router-dom";
import { Compass, HeartPulse, Home, KeyRound, LogOut, MapPin, MessageSquare } from "lucide-react";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationBell from "@/components/NotificationBell";
import SparksBalanceChip from "@/components/wallet/SparksBalanceChip";
import logoImg from "@/assets/logo.svg";
import logoDarkImg from "@/assets/logo-dark.svg";

interface AppLayoutProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  showSignOut?: boolean;
  hideMobileHeader?: boolean;
  variant?: "default" | "blood";
}

const AppLayout = ({ title, subtitle, action, children, showSignOut = false, hideMobileHeader = false, variant = "default" }: AppLayoutProps) => {
  const isBlood = variant === "blood";
  const blobClass = isBlood ? "bg-destructive/40" : "bg-primary/25";
  const heroBgClass = isBlood
    ? "bg-gradient-to-br from-[hsl(var(--hero))] via-[hsl(var(--hero))] to-destructive/30"
    : "bg-hero";
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role, isStaff } = useUserRole();
  const { unreadByType } = useNotifications();
  const messagesBadge = unreadByType.message + unreadByType.contact_request;

  const profilePath = isStaff ? "/admin" : role === "worker" ? "/worker-dashboard" : "/dashboard";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    { label: "Home", to: "/", icon: Home, badge: 0 },
    { label: "Explore", to: "/discover", icon: Compass, badge: 0 },
    { label: "Blood Konnect", to: "/blood-donors", icon: HeartPulse, emphasis: true, badge: 0 },
    { label: "Messages", to: "/messages", icon: MessageSquare, badge: messagesBadge },
  ];

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "You";

  return (
    <div className="min-h-screen bg-hero text-hero-foreground overflow-x-hidden">
      {/* MOBILE: bold compact hero header */}
      <div className="md:hidden">
        {hideMobileHeader ? null : title ? (
          <div className={`relative overflow-hidden ${heroBgClass} text-hero-foreground rounded-b-[1.75rem] px-4 pt-5 pb-6`}>
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div aria-hidden className={`pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full ${blobClass} blur-3xl`} />
            {isBlood && <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-destructive/30 blur-3xl" />}
            <div className="relative flex items-center justify-between">
              <Link to="/" className="inline-flex items-center">
                <img src={logoImg} alt="Near Konnect" className="block h-10 w-auto max-w-[55vw] object-contain" />
              </Link>
              <div className="flex items-center gap-2">{user && <SparksBalanceChip />}{user && <NotificationBell />}</div>
            </div>
            <div className="relative mt-5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {isBlood && (
                  <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-destructive/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-destructive-foreground ring-1 ring-destructive/40">
                    <HeartPulse className="h-3 w-3" /> Save Lives
                  </span>
                )}
                <h1 className="text-[22px] font-bold leading-tight tracking-tight line-clamp-2 break-words">{title}</h1>
                {subtitle && <p className="mt-1 text-[13px] leading-snug text-hero-muted line-clamp-2">{subtitle}</p>}
              </div>
              {action && <div className="shrink-0">{action}</div>}
            </div>
          </div>
        ) : (
          <div className={`relative overflow-hidden ${heroBgClass} text-hero-foreground rounded-b-[1.75rem] px-4 pt-5 pb-5`}>
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div aria-hidden className={`pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full ${blobClass} blur-3xl`} />
            <div className="relative flex items-center justify-between">
              <Link to="/" className="inline-flex items-center">
                <img src={logoImg} alt="Near Konnect" className="block h-10 w-auto max-w-[55vw] object-contain" />
              </Link>
              <div className="flex items-center gap-2">{user && <SparksBalanceChip />}{user && <NotificationBell />}</div>
            </div>
          </div>
        )}

        <main className="px-4 pt-5 pb-24 my-[70px]">{children}</main>

        {user && showSignOut && (
          <div className="bg-hero px-4 pb-8 pt-2 flex flex-col items-center gap-4 text-hero-foreground">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="gap-2 rounded-full border-destructive/40 bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP: top navigation + dark hero card */}
      <div className="mx-auto hidden max-w-[1200px] flex-col md:flex md:px-4 md:py-6 md:gap-5">
        <header className="sticky top-4 z-30 flex items-center gap-4 rounded-2xl border border-hero-foreground/10 bg-hero/80 text-hero-foreground px-4 py-2.5 backdrop-blur-xl shadow-[0_8px_32px_-12px_hsl(var(--hero)/0.6)] relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div aria-hidden className={`pointer-events-none absolute -top-20 -right-20 h-44 w-44 rounded-full ${isBlood ? "bg-destructive/30" : "bg-primary/20"} blur-3xl`} />
          <Link to="/" className="relative flex shrink-0 items-center pl-2 pr-3">
            <img src={logoImg} alt="Near Konnect" className="h-12 object-contain" />
          </Link>

          <nav className="relative flex flex-1 items-center justify-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.55)]"
                      : "text-hero-foreground/60 hover:bg-hero-foreground/10 hover:text-hero-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="text-[11px] leading-none">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-hero">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="relative flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-2">{user && <SparksBalanceChip />}{user && <NotificationBell />}</div>
            <button
              onClick={() => navigate(profilePath)}
              className="inline-flex items-center gap-2 rounded-full border border-hero-foreground/10 bg-hero-foreground/5 px-3 py-1.5 text-sm font-semibold text-hero-foreground transition-colors hover:bg-hero-foreground/10"
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
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-hero-foreground/60 transition-colors hover:bg-destructive hover:text-destructive-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            )}
          </div>
        </header>

        <div className="min-w-0 flex-1 space-y-5">

          {title && (
            <div className={`relative overflow-hidden border rounded-3xl px-8 py-7 flex flex-wrap items-start justify-between gap-3 text-hero-foreground ${isBlood ? "border-destructive/30 bg-gradient-to-br from-hero-foreground/[0.04] via-destructive/10 to-destructive/20" : "border-hero-foreground/10 bg-hero-foreground/[0.04]"}`}>
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              {isBlood && <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-destructive/30 blur-3xl" />}
              <div className="relative min-w-0">
                {isBlood && (
                  <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-destructive/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-destructive-foreground ring-1 ring-destructive/40">
                    <HeartPulse className="h-3.5 w-3.5" /> Save Lives
                  </span>
                )}
                <h1 className="text-3xl font-bold tracking-tight break-words">{title}</h1>
                {subtitle && <p className="mt-2 text-sm text-hero-foreground/60">{subtitle}</p>}
              </div>
              {action && <div className="relative">{action}</div>}
            </div>
          )}

          <main className={title ? "rounded-3xl border border-hero-foreground/10 bg-hero-foreground/[0.04] p-6 text-hero-foreground" : "text-hero-foreground"}>{children}</main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;