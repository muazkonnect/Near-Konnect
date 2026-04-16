import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard, MessageSquare, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useI18n } from "@/i18n";
import NotificationBell from "@/components/NotificationBell";
import logoImg from "@/assets/logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const { t } = useI18n();

  const dashboardLink = role === "worker"
    ? "/worker-dashboard"
    : role === "admin"
    ? "/admin"
    : "/dashboard";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/70 bg-card/90 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center">
          <img src={logoImg} alt="Near Konnect" className="h-9 object-contain" />
        </Link>

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
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <MessageSquare className="w-4 h-4" /> {t("nav.messages")}
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Right: auth buttons */}
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
              <Link to="/register">
                <Button size="sm" className="bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-md">{t("nav.signUp")}</Button>
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden ml-auto flex items-center gap-2" onClick={() => setOpen(!open)}>
          {user && <NotificationBell />}
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-card px-4 pb-4 pt-2 space-y-2">
          {user && (
            <>
              <Link to={dashboardLink} className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary" onClick={() => setOpen(false)}>
                {t("nav.dashboard")}
              </Link>
              <Link to="/blood-donors" className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary" onClick={() => setOpen(false)}>
                Blood Donors
              </Link>
              <Link to="/messages" className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary" onClick={() => setOpen(false)}>
                {t("nav.messages")}
              </Link>
            </>
          )}
          <div className="flex gap-2 pt-2">
            {user ? (
              <Button variant="outline" className="w-full" size="sm" onClick={() => { handleSignOut(); setOpen(false); }}>
                <LogOut className="w-4 h-4 mr-1" /> {t("nav.signOut")}
              </Button>
            ) : (
              <>
                <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full" size="sm">{t("nav.logIn")}</Button>
                </Link>
                <Link to="/register" className="flex-1" onClick={() => setOpen(false)}>
                  <Button className="w-full bg-gradient-brand text-primary-foreground" size="sm">{t("nav.signUp")}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;