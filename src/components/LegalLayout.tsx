import { Link } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import type { ReactNode } from "react";

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: ReactNode;
}

const LegalLayout = ({ title, subtitle, lastUpdated = "April 2026", children }: LegalLayoutProps) => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
      {/* Hero header — rounded box with dotted pattern */}
      <section className="relative overflow-hidden rounded-3xl bg-hero text-hero-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative px-6 py-10 md:px-10 md:py-14">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-hero-muted transition-colors hover:text-hero-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-hero-muted">
            <MapPin className="h-3.5 w-3.5 text-primary" /> NearKonnect
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-2xl text-sm text-hero-muted md:text-base">{subtitle}</p>}
          <p className="mt-5 text-xs text-hero-muted">Last updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Body */}
      <article className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm md:p-10 space-y-8">
        {children}
      </article>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
        <span aria-hidden>·</span>
        <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
        <span aria-hidden>·</span>
        <Link to="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link>
      </div>
    </div>
  </div>
);

export const LegalSection = ({
  index,
  title,
  children,
}: {
  index?: string | number;
  title: string;
  children: ReactNode;
}) => (
  <section className="space-y-3">
    <div className="flex items-center gap-3">
      {index !== undefined && (
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
          {index}
        </span>
      )}
      <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
    </div>
    <div className="text-sm leading-relaxed text-muted-foreground space-y-3">{children}</div>
  </section>
);

export default LegalLayout;
