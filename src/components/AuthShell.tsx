import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logoImg from "@/assets/logo.svg";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  brand?: string;
  showBack?: boolean;
  /** Optional content rendered inside the dark hero, below the title (e.g. tab toggle) */
  heroExtra?: ReactNode;
  children: ReactNode;
}

/**
 * Servicely-style auth layout: deep black hero with brand chip, large title,
 * optional toggle, then a white card body. Mobile-first; centers nicely on desktop.
 */
const AuthShell = ({ title, subtitle, brand = "NearKonnect", showBack = true, heroExtra, children }: AuthShellProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        {/* Dark hero */}
        <div className="relative overflow-hidden bg-hero text-hero-foreground rounded-b-[2.5rem] px-6 pb-10 pt-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <img aria-hidden src={logoImg} alt="" className="pointer-events-none absolute -right-10 -bottom-8 h-40 w-auto opacity-[0.05] select-none rotate-[-8deg]" />
          <div className="flex items-center justify-between">
            {showBack ? (
              <button
                onClick={() => navigate(-1)}
                aria-label="Back"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-hero-foreground transition hover:bg-white/15"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <span className="h-10 w-10" />
            )}

            <Link to="/" className="inline-flex items-center">
              <img src={logoImg} alt={brand} className="h-8 object-contain" />
            </Link>

            <span className="h-10 w-10" />
          </div>

          <div className="mt-7">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-hero-muted">{subtitle}</p>}
          </div>

          {heroExtra && <div className="mt-6">{heroExtra}</div>}
        </div>

        {/* White card body */}
        <div className="flex-1 px-6 pt-6 pb-10">{children}</div>
      </div>
    </div>
  );
};

export default AuthShell;
