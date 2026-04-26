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
  const bloodDot = unreadByType.blood_request > 0;

  const items = [
    { label: "Home", to: "/", icon: Home, badge: 0, dot: false, accent: false },
    { label: "Explore", to: "/discover", icon: Compass, badge: 0, dot: false, accent: false },
    { label: "Blood", to: "/blood-donors", icon: HeartPulse, badge: 0, dot: bloodDot, accent: true },
    { label: "Inbox", to: "/messages", icon: MessageSquare, badge: messagesBadge, dot: false, accent: false },
    { label: "Me", to: profilePath, icon: User, badge: 0, dot: false, accent: false },
  ];

  if (shouldHide) return null;

  const isActive = (to: string) => pathname === to || (to !== "/" && pathname.startsWith(to));

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50"
      aria-label="Primary mobile navigation"
    >
      {/* Soft gradient mask above for content fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-background to-transparent"
      />

      <div
        className="relative bg-card/95 backdrop-blur-2xl border-t border-border/40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="relative mx-auto flex h-16 max-w-md items-stretch justify-around px-1">
          {items.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            const accentColor = item.accent;

            return (
              <li key={item.label} className="flex-1">
                <Link
                  to={item.to}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="tap-feedback group relative flex h-full w-full flex-col items-center justify-center"
                >
                  {/* Top active bar */}
                  <span
                    aria-hidden
                    className={`absolute top-0 h-[3px] rounded-b-full transition-all duration-300 ${
                      active
                        ? `w-10 ${accentColor ? "bg-destructive" : "bg-primary"}`
                        : "w-0 bg-transparent"
                    }`}
                  />

                  {/* Icon container */}
                  <span
                    className={`relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                      active
                        ? accentColor
                          ? "bg-destructive/12 scale-100"
                          : "bg-primary/12 scale-100"
                        : "scale-95"
                    }`}
                  >
                    <Icon
                      className={`transition-all duration-300 ${
                        active
                          ? `h-[22px] w-[22px] ${accentColor ? "text-destructive" : "text-primary"}`
                          : "h-[21px] w-[21px] text-muted-foreground group-hover:text-foreground"
                      }`}
                      strokeWidth={active ? 2.5 : 2}
                      fill={active && accentColor ? "currentColor" : "none"}
                    />

                    {item.dot && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                    )}
                    {item.badge > 0 && (
                      <span className="absolute top-0.5 right-0.5 inline-flex h-[16px] min-w-[16px] -translate-y-0.5 translate-x-0.5 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-card">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </span>

                  {/* Label */}
                  <span
                    className={`mt-0.5 text-[10px] font-semibold leading-none transition-colors ${
                      active
                        ? accentColor
                          ? "text-destructive"
                          : "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
