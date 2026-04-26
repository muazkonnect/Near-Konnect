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

  const leftItems = [
    { label: "Home", to: "/", icon: Home, badge: 0 },
    { label: "Explore", to: "/discover", icon: Compass, badge: 0 },
  ];
  const rightItems = [
    { label: "Inbox", to: "/messages", icon: MessageSquare, badge: messagesBadge },
    { label: "Profile", to: profilePath, icon: User, badge: 0 },
  ];

  const fab = {
    label: "Donate",
    to: "/blood-donors",
    icon: HeartPulse,
    hasDot: unreadByType.blood_request > 0,
  };

  if (shouldHide) return null;

  const isActive = (to: string) => pathname === to || (to !== "/" && pathname.startsWith(to));

  const renderItem = (item: { label: string; to: string; icon: any; badge: number }) => {
    const active = isActive(item.to);
    return (
      <Link
        key={item.label}
        to={item.to}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className="tap-feedback group relative flex flex-1 flex-col items-center justify-center gap-1 py-2"
      >
        {/* Active indicator pill at top */}
        <span
          className={`absolute top-0 h-1 w-8 rounded-full transition-all duration-300 ${
            active ? "bg-primary opacity-100" : "opacity-0"
          }`}
        />
        <span className="relative">
          <item.icon
            className={`h-[22px] w-[22px] transition-all duration-200 ${
              active ? "text-primary scale-110" : "text-muted-foreground group-hover:text-foreground"
            }`}
            strokeWidth={active ? 2.5 : 2}
          />
          {item.badge > 0 && (
            <span className="absolute -top-1.5 -right-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-card">
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          )}
        </span>
        <span
          className={`text-[10px] font-semibold leading-none transition-colors ${
            active ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50"
      aria-label="Primary mobile navigation"
    >
      {/* Backdrop blur container */}
      <div
        className="relative border-t border-border/40 bg-card/90 backdrop-blur-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* SVG curve cutout for FAB */}
        <svg
          className="absolute left-1/2 -top-[1px] -translate-x-1/2 text-card/90"
          width="80"
          height="28"
          viewBox="0 0 80 28"
          fill="currentColor"
          aria-hidden
        >
          <path d="M0 1 C 18 1, 18 28, 40 28 C 62 28, 62 1, 80 1 L 80 0 L 0 0 Z" />
        </svg>

        <ul className="relative flex items-stretch justify-between px-2">
          {leftItems.map(renderItem)}
          <li className="w-[72px] shrink-0" aria-hidden />
          {rightItems.map(renderItem)}
        </ul>

        {/* Floating FAB */}
        <Link
          to={fab.to}
          aria-label={fab.label}
          className="tap-feedback absolute left-1/2 -translate-x-1/2 -top-7 flex h-[58px] w-[58px] items-center justify-center rounded-full text-destructive-foreground shadow-[0_8px_24px_-4px_hsl(var(--destructive)/0.5)] transition-transform active:scale-90"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--destructive)) 0%, hsl(var(--destructive)/0.8) 100%)",
          }}
        >
          <fab.icon className="h-7 w-7" strokeWidth={2.5} />
          {fab.hasDot && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-card ring-2 ring-destructive animate-pulse" />
          )}
        </Link>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
