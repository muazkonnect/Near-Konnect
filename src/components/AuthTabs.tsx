import { useNavigate, useLocation } from "react-router-dom";
import RoleSelectDialog from "@/components/RoleSelectDialog";

/** Lime/dark pill toggle between Log In and Sign Up shown inside the auth hero. */
const AuthTabs = ({ active }: { active: "login" | "register" }) => {
  const navigate = useNavigate();
  const { search } = useLocation();

  const baseClass = (isActive: boolean) =>
    `w-full rounded-full py-2.5 text-sm font-semibold transition ${
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-hero-muted hover:text-hero-foreground"
    }`;

  return (
    <div className="grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1">
      <button
        type="button"
        onClick={() => navigate(`/login${search}`)}
        className={baseClass(active === "login")}
      >
        Log In
      </button>
      <RoleSelectDialog>
        <button type="button" className={baseClass(active === "register")}>
          Sign Up
        </button>
      </RoleSelectDialog>
    </div>
  );
};

export default AuthTabs;
