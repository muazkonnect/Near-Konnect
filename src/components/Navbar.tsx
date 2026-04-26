import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard, MessageSquare, Heart, ChevronRight, User as UserIcon, Compass, Home as HomeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotifications } from "@/hooks/useNotifications";
import { useI18n } from "@/i18n";
import logoImg from "@/assets/logo.svg";
import RoleSelectDialog from "@/components/RoleSelectDialog";
import NotificationBell from "@/components/NotificationBell";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role, isStaff } = useUserRole();
  const { unreadByType } = useNotifications();
  const messagesBadge = unreadByType.message + unreadByType.contact_request;
  const { t } = useI18n();

  const dashboardLink = isStaff
    ? "/admin"
    : role === "worker"
    ? "/worker-dashboard"
    : "/dashboard";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setOpen(false);
  };

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "";
  const initial = (firstName || user?.email || "U").charAt(0).toUpperCase();

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-card/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-3 md:h-16 md:px-4">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center">
            <img src={logoImg} alt="Near Konnect" className="h-7 object-contain md:h-9" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 min-w-[220px]">
            {user && (
              <>
                <Link to={dashboardLink}>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <LayoutDashboard className="w-4 h-4" /> {t("nav.dashboard")}
                  </Button>
                </Link>
                <Link to="/blood-donors">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <Heart className="w-4 h-4" /> Donors
                  </Button>
                </Link>
                <Link to="/messages">
                  <Button variant="ghost" size="sm" className="relative gap-1.5 text-muted-foreground hover:text-foreground">
                    <MessageSquare className="w-4 h-4" /> {t("nav.messages")}
                    {messagesBadge > 0 && (
                      <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-none text-destructive-foreground">
                        {messagesBadge > 9 ? "9+" : messagesBadge}
                      </span>
                    )}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-2 min-w-[220px] justify-end">
            {user ? (
              <>
                <NotificationBell />
                <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                  {user.user_metadata?.full_name || user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <LogOut className="w-4 h-4" /> {t("nav.signOut")}
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">{t("nav.logIn")}</Button>
                </Link>
                <RoleSelectDialog>
                  <Button size="sm" className="bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-md">{t("nav.signUp")}</Button>
                </RoleSelectDialog>
              </>
            )}
          </div>

          {/* Mobile right cluster */}
          <div className="md:hidden ml-auto flex items-center gap-1.5">
            {user && <NotificationBell />}
            {user ? (
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className="tap-feedback flex h-9 items-center gap-1.5 rounded-full bg-primary/10 pl-1 pr-2.5 transition-colors active:bg-primary/15"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-brand text-[12px] font-bold text-primary-foreground">
                  {initial}
                </span>
                <Menu className="h-4 w-4 text-foreground/80" />
              </button>
            ) : (
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className="tap-feedback grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile sheet (slide-in from top) */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative ml-auto h-full w-[86%] max-w-sm bg-card shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                {user ? (
                  <>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-brand text-base font-bold text-primary-foreground">
                      {initial}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{firstName || "Account"}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-bold text-foreground">Welcome to NearKonnect</p>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {user ? (
                <ul className="space-y-1">
                  {[
                    { to: "/", icon: HomeIcon, label: "Home" },
                    { to: "/discover", icon: Compass, label: "Explore" },
                    { to: dashboardLink, icon: LayoutDashboard, label: t("nav.dashboard") },
                    { to: "/blood-donors", icon: Heart, label: "Blood Donors", urgent: true },
                    { to: "/messages", icon: MessageSquare, label: t("nav.messages"), badge: messagesBadge },
                  ].map((m: any) => (
                    <li key={m.label}>
                      <Link
                        to={m.to}
                        onClick={() => setOpen(false)}
                        className="tap-feedback flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-foreground transition-colors active:bg-muted"
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${m.urgent ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"}`}>
                          <m.icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1">{m.label}</span>
                        {m.badge > 0 && (
                          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                            {m.badge > 9 ? "9+" : m.badge}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3 px-1 pt-2">
                  <p className="text-sm text-muted-foreground">Sign in to access your dashboard, messages and saved services.</p>
                  <Link to="/login" onClick={() => setOpen(false)} className="block">
                    <Button variant="outline" className="w-full">{t("nav.logIn")}</Button>
                  </Link>
                  <div onClick={() => setOpen(false)}>
                    <RoleSelectDialog>
                      <Button className="w-full bg-gradient-brand text-primary-foreground">{t("nav.signUp")}</Button>
                    </RoleSelectDialog>
                  </div>
                </div>
              )}
            </div>

            {user && (
              <div className="border-t border-border/60 px-4 py-3">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" /> {t("nav.signOut")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
