import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { Navigate, useLocation } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  allow: AppRole[];
}

const RoleProtectedRoute = ({ children, allow }: Props) => {
  const { user, loading } = useAuth();
  const { roles, isLoading } = useUserRole();
  const location = useLocation();

  if (loading || (user && isLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  const ok = roles.some((r) => allow.includes(r));
  if (!ok) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default RoleProtectedRoute;
