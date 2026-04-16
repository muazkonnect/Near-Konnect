import { useEffect } from "react";
import { Home, Compass, Siren, MessageSquare, User, Plus, BriefcaseBusiness, Droplets, Megaphone, LogOut, Settings } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
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
      : role === "admin"
        ? "/admin"
        : "/dashboard";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const items = [
    { label: "Home", to: "/", icon: Home },
    { label: "Explore", to: "/discover", icon: Compass },
    { label: "Requests", to: "/blood-donors", icon: Siren, urgent: true },
    { label: "Messages", to: "/messages", icon: MessageSquare },
    { label: "Profile", to: profilePath, icon: User },
  ];

  if (shouldHide) return null;

  return (
    <>
      <div className="md:hidden fixed bottom-[5.5rem] right-4 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" className="h-14 w-14 rounded-2xl shadow-premium">
              <Plus className="h-6 w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 rounded-2xl p-2">
            <Link to="/discover" className="tap-feedback flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted">
              <BriefcaseBusiness className="h-4 w-4 text-primary" />
              <span>Find Service</span>
            </Link>
            <Link to="/blood-donors" className="tap-feedback flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted">
              <Droplets className="h-4 w-4 text-destructive" />
              <span>Request Blood</span>
            </Link>
            <Link to="/blood-donors" className="tap-feedback flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted">
              <Megaphone className="h-4 w-4 text-secondary" />
              <span>Post Job</span>
            </Link>
            {user && (
              <>
                <div className="my-1 h-px bg-border" />
                <Link to={profilePath} className="tap-feedback flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-muted">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Account</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="tap-feedback flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <nav className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.25rem)] max-w-md rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-premium px-2 py-2">
      <ul className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));

          return (
            <li key={item.label}>
              <Link
                to={item.to}
                className={`tap-feedback flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition-all ${
                  active
                    ? "bg-primary/10 text-primary"
                    : item.urgent
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                <item.icon className={`h-4 w-4 ${item.urgent && !active ? "text-destructive" : ""}`} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
    </>
  );
};

export default MobileBottomNav;