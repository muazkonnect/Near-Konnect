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

  const leftItems = [
    { label: "Home", to: "/", icon: Home, badge: 0, dot: false },
    { label: "Explore", to: "/discover", icon: Compass, badge: 0, dot: false },
  ];
  const rightItems = [
    { label: "Inbox", to: "/messages", icon: MessageSquare, badge: messagesBadge, dot: false },
    { label: "Me", to: profilePath, icon: User, badge: 0, dot: false },
  ];

  if (shouldHide) return null;

  const isActive = (to: string) => pathname === to || (to !== "/" && pathname.startsWith(to));
  const fabActive = isActive("/blood-donors");

  const renderItem = (item: { label: string; to: string; icon: any; badge: number; dot: boolean }) => {
    const active = isActive(item.to);
    return (
      <Link
        key={item.label}
        to={item.to}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className="tap-feedback group relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
      >
        <span
          className={`relative flex h-7 w-7 items-center justify-center transition-all duration-300 ${
            active ? "-translate-y-0.5" : ""
          }`}
        >
          <item.icon
            className={`transition-all duration-300 ${
              active ? "h-[24px] w-[24px] text-primary" : "h-[22px] w-[22px] text-muted-foreground"
            }`}
            strokeWidth={active ? 2.6 : 2}
          />
          {item.dot && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
          )}
          {item.badge > 0 && (
            <span className="absolute -top-1 -right-2 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground ring-2 ring-card">
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
        {/* Active dot indicator */}
        <span
          className={`absolute bottom-1 h-1 w-1 rounded-full transition-all duration-300 ${
            active ? "bg-primary opacity-100 scale-100" : "opacity-0 scale-0"
          }`}
        />
      </Link>
    );
  };

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50 pointer-events-none"
      aria-label="Primary mobile navigation"
    >
      {/* Soft fade overlay above nav for content separation */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent"
      />

      <div
        className="pointer-events-auto relative"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Main bar */}
        <div className="relative mx-auto flex h-[68px] max-w-md items-stretch border-t border-border/50 bg-card/95 backdrop-blur-2xl">
          <div className="flex flex-1">{leftItems.map(renderItem)}</div>
          {/* FAB cradle spacer */}
          <div className="relative w-[72px] shrink-0">
            {/* notch background */}
            <div
              aria-hidden
              className="absolute -top-5 left-1/2 h-10 w-20 -translate-x-1/2 rounded-b-full bg-card/95 backdrop-blur-2xl"
            />
          </div>
          <div className="flex flex-1">{rightItems.map(renderItem)}</div>
        </div>

        {/* Floating Action Button */}
        <Link
          to="/blood-donors"
          aria-label="Blood Konnect"
          aria-current={fabActive ? "page" : undefined}
          className="tap-feedback absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 18px)" }}
        >
          <span
            className={`relative flex h-16 w-16 items-center justify-center rounded-full text-destructive-foreground shadow-[0_10px_28px_-6px_hsl(var(--destructive)/0.55)] ring-[6px] ring-background transition-all duration-300 ${
              fabActive ? "scale-110" : "active:scale-90"
            }`}
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--destructive)) 0%, hsl(var(--destructive)/0.78) 100%)",
            }}
          >
            <HeartPulse className="h-7 w-7" strokeWidth={2.6} />
            {bloodDot && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-card ring-2 ring-destructive animate-pulse" />
            )}
            {/* subtle ambient glow ring */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20"
            />
          </span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
