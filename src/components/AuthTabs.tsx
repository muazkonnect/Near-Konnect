import { useNavigate, useLocation } from "react-router-dom";

/** Lime/dark pill toggle between Log In and Sign Up shown inside the auth hero. */
const AuthTabs = ({ active }: { active: "login" | "register" }) => {
  const navigate = useNavigate();
  const { search } = useLocation();

  const tabs: { key: "login" | "register"; label: string; to: string }[] = [
    { key: "login", label: "Log In", to: `/login${search}` },
    { key: "register", label: "Sign Up", to: `/register${search}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => navigate(tab.to)}
            className={`rounded-full py-2.5 text-sm font-semibold transition ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-hero-muted hover:text-hero-foreground"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default AuthTabs;
