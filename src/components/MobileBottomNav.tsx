import { useEffect } from "react";
import { Home, Compass, HeartPulse, MessageSquare, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotifications } from "@/hooks/useNotifications";

const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { role } = useUserRole();

  const hideNavRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/terms", "/privacy", "/disclaimer"];
  const shouldHide = hideNavRoutes.some((route) => pathname.startsWith(route));

  useEffect(() => {
    document.body.classList.add("has-mobile-bottom-nav");
    return () => document.body.classList.remove("has-mobile-bottom-nav");
  }, []);

  const profilePath = !user
    ? "/login"
    : role === "worker"
      ? "/worker-dashboard"
      : role === "admin" || role === "manager" || role === "ads_manager" || role === "moderator"
        ? "/admin"
        : "/dashboard";

  const { unreadByType } = useNotifications();
  const messagesBadge = unreadByType.message + unreadByType.contact_request;

  // Side nav items (split around center FAB)
  const leftItems = [
    { label: "Home", to: "/", icon: Home, hasDot: false },
    { label: "Explore", to: "/discover", icon: Compass, hasDot: false },
  ];
  const rightItems = [
    { label: "Inbox", to: "/messages", icon: MessageSquare, hasDot: messagesBadge > 0, badge: messagesBadge },
    { label: "Profile", to: profilePath, icon: User, hasDot: false, badge: 0 },
  ];

  const fab = {
    label: "Blood",
    to: "/blood-donors",
    icon: HeartPulse,
    hasDot: unreadByType.blood_request > 0,
  };

  if (shouldHide) return null;

  const isActive = (to: string) => pathname === to || (to !== "/" && pathname.startsWith(to));

  const renderItem = (item: { label: string; to: string; icon: any; hasDot: boolean; badge?: number }) => {
    const active = isActive(item.to);
    return (
      <Link
        key={item.label}
        to={item.to}
        className={`tap-feedback group relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold transition-all`}
      >
        <span className="relative">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${
              active
                ? "bg-primary text-primary-foreground shadow-[0_6px_18px_-6px_hsl(var(--primary)/0.6)]"
                : "text-muted-foreground group-hover:text-foreground"
            }`}
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
          </span>
          {item.hasDot && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
          )}
          {item.badge && item.badge > 0 ? (
            <span className="absolute -top-1 -right-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-card">
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          ) : null}
        </span>
        <span className={`mt-0.5 leading-none ${active ? "text-foreground" : "text-muted-foreground"}`}>
          {item.label}
        </span>
      </Link>
    );
  };

  const fabActive = isActive(fab.to);

  return (
    <nav
      className="md:hidden fixed left-1/2 z-50 -translate-x-1/2"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      aria-label="Primary mobile navigation"
    >
      <div className="relative w-[min(94vw,28rem)] rounded-[2rem] border border-border/60 bg-card/95 px-2 py-2 shadow-[0_18px_40px_-18px_hsl(var(--foreground)/0.45)] backdrop-blur-2xl">
        <ul className="flex items-stretch justify-between gap-1">
          {leftItems.map(renderItem)}
          {/* Spacer for FAB */}
          <li className="w-[68px] shrink-0" aria-hidden />
          {rightItems.map(renderItem)}
        </ul>

        {/* Center FAB */}
        <Link
          to={fab.to}
          aria-label={fab.label}
          className={`tap-feedback absolute left-1/2 -translate-x-1/2 -top-6 flex h-14 w-14 items-center justify-center rounded-full text-destructive-foreground shadow-[0_12px_28px_-8px_hsl(var(--destructive)/0.65)] ring-4 ring-card transition-transform active:scale-95 ${
            fabActive ? "scale-105" : ""
          }`}
          style={{ background: "linear-gradient(135deg, hsl(var(--destructive)) 0%, hsl(var(--destructive)/0.85) 100%)" }}
        >
          <fab.icon className="h-6 w-6" strokeWidth={2.4} />
          {fab.hasDot && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-card ring-2 ring-destructive animate-pulse" />
          )}
          <span className="sr-only">{fab.label}</span>
        </Link>
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-4 text-[10px] font-bold uppercase tracking-wider text-destructive">
          {fab.label}
        </span>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
