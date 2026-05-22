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

  const hideNavRoutes = ["/login", "/register", "/forgot-password", "/reset-password", "/terms", "/privacy", "/disclaimer", "/chat/"];
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
  const bloodDot = unreadByType.blood_request > 0;

  const items = [
    { label: "Home", to: "/", icon: Home, badge: 0, dot: false },
    { label: "Explore", to: "/discover", icon: Compass, badge: 0, dot: false },
    { label: "Blood", to: "/blood-donors", icon: HeartPulse, badge: 0, dot: bloodDot, accent: true },
    { label: "Inbox", to: "/messages", icon: MessageSquare, badge: messagesBadge, dot: false },
    { label: "Profile", to: profilePath, icon: User, badge: 0, dot: false },
  ];

  if (shouldHide) return null;

  const isActive = (to: string) => pathname === to || (to !== "/" && pathname.startsWith(to));

  return (
    <nav
      className="md:hidden fixed left-1/2 z-50 -translate-x-1/2"
      style={{ bottom: "calc(0.85rem + env(safe-area-inset-bottom))" }}
      aria-label="Primary mobile navigation"
    >
      <div className="relative flex items-center gap-1 rounded-full border border-border/50 bg-card/85 px-2 py-1.5 shadow-[0_20px_50px_-20px_hsl(var(--foreground)/0.5)] backdrop-blur-2xl">
        {items.map((item) => {
          const active = isActive(item.to);
          const accent = item.accent && active;
          return (
            <Link
              key={item.label}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`tap-feedback group relative flex items-center justify-center rounded-full transition-all duration-300 ${
                active
                  ? accent
                    ? "bg-destructive text-destructive-foreground h-11 w-11 shadow-[0_8px_20px_-6px_hsl(var(--destructive)/0.6)]"
                    : "bg-primary text-primary-foreground h-11 w-11 shadow-[0_8px_20px_-6px_hsl(var(--primary)/0.6)]"
                  : "h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <span className="relative flex items-center justify-center">
                <item.icon
                  className={`transition-all ${active ? "h-[18px] w-[18px]" : "h-[20px] w-[20px]"}`}
                  strokeWidth={active ? 2.5 : 2}
                />
                {item.dot && !active && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                )}
                {item.badge > 0 && !active && (
                  <span className="absolute -top-1.5 -right-2 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-card">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
