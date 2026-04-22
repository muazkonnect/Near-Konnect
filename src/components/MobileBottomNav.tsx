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

  const items = [
    { label: "Home", to: "/", icon: Home, hasDot: false },
    { label: "Explore", to: "/discover", icon: Compass, hasDot: false },
    { label: "BLood  Bank", to: "/blood-donors", icon: HeartPulse, urgent: true, hasDot: unreadByType.blood_request > 0 || unreadByType.booking > 0 },
    { label: "Messages", to: "/messages", icon: MessageSquare, hasDot: messagesBadge > 0 },
    { label: "Profile", to: profilePath, icon: User, hasDot: false },
  ];

  if (shouldHide) return null;

  return (
    <nav className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.25rem)] max-w-md rounded-3xl border border-border/70 bg-card/98 backdrop-blur-xl shadow-premium px-3 py-2.5">
      <ul className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));

          return (
            <li key={item.label}>
              <Link
                to={item.to}
                className={`tap-feedback flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : item.urgent
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                <span className="relative">
                  <item.icon className={`h-[18px] w-[18px] ${item.urgent && !active ? "text-destructive" : ""}`} />
                  {item.hasDot && (
                    <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
