import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

const Footer = () => {
  const legalLinks = [
    { label: "Terms & Conditions", to: "/terms" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Disclaimer", to: "/disclaimer" },
  ];

  const appLinks = [
    { label: "Home", to: "/" },
    { label: "Explore", to: "/discover" },
    { label: "Blood Konnect", to: "/blood-donors" },
    { label: "Messages", to: "/messages" },
  ];

  return (
    <footer className="relative overflow-hidden bg-hero text-hero-foreground mt-12 md:mx-4 md:mb-4 md:rounded-3xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="relative px-6 py-10 md:px-10 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-center">
          {/* Left: Explore */}
          <div className="md:text-left">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-hero-muted">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm">
              {appLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-hero-muted transition-colors hover:text-hero-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Middle: Logo */}
          <div className="flex flex-col items-center justify-center text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">NearKonnect</span>
            </Link>
            <p className="mt-3 max-w-xs text-xs text-hero-muted">
              Connecting you with trusted local professionals near your location.
            </p>
          </div>

          {/* Right: Legal */}
          <div className="md:text-right">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-hero-muted">
              Legal
            </h4>
            <ul className="space-y-2.5 text-sm">
              {legalLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-hero-muted transition-colors hover:text-hero-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-5 sm:flex-row">
          <p className="text-xs text-hero-muted">
            © {new Date().getFullYear()} NearKonnect. All rights reserved.
          </p>
          <p className="text-xs text-hero-muted">Built with care for your community.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
