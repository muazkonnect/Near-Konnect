import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Briefcase, Globe, HeartPulse, MapPin, Search, ShieldCheck, Sparkles, Star, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Home from "@/pages/Home";
import logoImg from "@/assets/logo.svg";
import RoleSelectDialog from "@/components/RoleSelectDialog";
import NativeAdCard from "@/components/NativeAdCard";
import { useNativeAds } from "@/hooks/useSponsored";

const slides = [
  {
    eyebrow: "Local help network",
    title: ["Find help or", "offer your skills"],
    description: "Connect with local professionals in real-time or start earning by providing services in your area.",
  },
  {
    eyebrow: "Trusted community",
    title: ["Trusted local", "service network"],
    description: "Verified profiles, real reviews, and instant chat — get matched with helpers around you in seconds.",
  },
  {
    eyebrow: "Live response feed",
    title: ["Urgent help,", "fast response"],
    description: "From blood requests to emergency repairs, your community responds when you need it most.",
  },
];

const actions = [
  { icon: Search, title: "Find a Service", subtitle: "I need to hire a local professional", to: "/discover", tone: "primary" as const },
  { icon: Briefcase, title: "Become a Worker", subtitle: "I want to offer my services & earn", to: "/register?role=worker", tone: "card" as const },
  { icon: HeartPulse, title: "Blood Konnect", subtitle: "Donate • Request • Save Lives", to: "/blood-donors", tone: "card" as const },
];

const trustPoints = [
  { icon: ShieldCheck, title: "Verified profiles", text: "Real identities, ratings and reviews from your community." },
  { icon: Sparkles, title: "Instant matching", text: "Smart suggestions based on your location and needs." },
  { icon: HeartPulse, title: "Emergency ready", text: "Urgent and blood requests stand out and respond fast." },
];

const popularSearches = ["Electrician", "Plumber", "Tutor", "Delivery", "AC Repair", "Cleaner"];

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [slideIndex, setSlideIndex] = useState(0);
  const [search, setSearch] = useState("");
  const bannerAds = useNativeAds("home_banner");

  useEffect(() => {
    const id = setInterval(() => setSlideIndex((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(id);
  }, []);

  if (!loading && user) return <Home />;

  const slide = slides[slideIndex];

  const submitSearch = (q: string) => {
    if (!q.trim()) return navigate("/discover");
    navigate(`/discover?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-md md:max-w-7xl md:px-6 md:pt-6">
        <div className="flex flex-col md:grid md:grid-cols-[1.15fr_1fr] md:gap-10 md:items-stretch">
          {/* DARK HERO */}
          <section className="relative isolate overflow-hidden rounded-b-[2.5rem] bg-hero px-6 pb-12 pt-7 text-hero-foreground md:rounded-[2rem] md:p-10">
            {/* Decorative blobs */}
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{
              backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }} />

            <div className="relative flex items-center justify-between">
              <div className="inline-flex items-center">
                <img src={logoImg} alt="NearKonnect" className="h-14 object-contain" />
              </div>
              <button className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-hero-foreground hover:bg-white/15">
                <Globe className="h-3.5 w-3.5" /> EN
              </button>
            </div>

            <div className="relative mt-10 md:mt-14">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slideIndex}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.4 }}
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-hero-muted">
                    <Zap className="h-3 w-3 text-primary" /> {slide.eyebrow}
                  </span>
                  <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                    {slide.title[0]}
                    <br />
                    <span className="text-primary">{slide.title[1]}</span>
                  </h1>
                  <p className="mt-4 max-w-md text-sm text-hero-muted md:text-base">{slide.description}</p>
                </motion.div>
              </AnimatePresence>

              {/* Inline search */}
              <form
                onSubmit={(e) => { e.preventDefault(); submitSearch(search); }}
                className="mt-7 flex items-center gap-1 rounded-full bg-white/10 p-1.5 backdrop-blur-sm ring-1 ring-white/10 focus-within:ring-primary/40"
              >
                <Search className="ml-3 h-4 w-4 shrink-0 text-hero-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search services or city..."
                  className="flex-1 bg-transparent px-2 py-2 text-sm text-hero-foreground placeholder:text-hero-muted focus:outline-none"
                />
                <Button type="submit" size="sm" className="h-9 rounded-full px-4">Search</Button>
              </form>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-hero-muted">Popular:</span>
                {popularSearches.slice(0, 4).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => submitSearch(tag)}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-hero-muted hover:bg-white/10 hover:text-hero-foreground"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Slide dots */}
              <div className="mt-7 flex items-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === slideIndex ? "w-8 bg-primary" : "w-4 bg-white/20 hover:bg-white/40"}`}
                  />
                ))}
                <span className="ml-auto text-[11px] tabular-nums text-hero-muted">
                  0{slideIndex + 1} / 0{slides.length}
                </span>
              </div>
            </div>

            {/* Mini stat strip inside hero */}
            <div className="relative mt-8 grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-2 ring-1 ring-white/5">
              {[
                { v: "1.2k+", l: "Members" },
                { v: "4.9★", l: "Rating" },
                { v: "< 5m", l: "Response" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl px-2 py-2 text-center">
                  <p className="text-base font-bold">{s.v}</p>
                  <p className="text-[10px] uppercase tracking-wider text-hero-muted">{s.l}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ACTION CARDS */}
          <section className="flex flex-col gap-3 px-6 pb-10 pt-6 md:justify-center md:p-0">
            <div className="hidden md:mb-2 md:block">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Get started</p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">What brings you here today?</h2>
            </div>

            {actions.map((action, idx) => {
              const isPrimary = action.tone === "primary";
              return (
                <motion.button
                  key={action.title}
                  onClick={() => navigate(action.to)}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  className={`group flex items-center gap-4 rounded-3xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg md:p-5 ${
                    isPrimary
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-foreground/15"
                  }`}
                >
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition-colors ${
                    isPrimary ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                  }`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-base font-bold ${isPrimary ? "text-primary-foreground" : "text-card-foreground"}`}>{action.title}</p>
                    <p className={`text-xs ${isPrimary ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{action.subtitle}</p>
                  </div>
                  <ArrowRight className={`h-5 w-5 transition-transform group-hover:translate-x-1 ${
                    isPrimary ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  }`} />
                </motion.button>
              );
            })}

            <div className="mt-2 rounded-3xl bg-muted/60 p-4 md:p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Already a member?</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/login")}>Log In</Button>
                <RoleSelectDialog>
                  <Button className="flex-1">Sign Up</Button>
                </RoleSelectDialog>
              </div>
            </div>
          </section>
        </div>

        {/* SOCIAL PROOF STRIP */}
        <section className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card px-5 py-4 md:mx-0 md:mt-12">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" /> 1,200+ active members
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <Star className="h-4 w-4 fill-star text-star" /> 4.9 avg rating
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" /> Verified profiles
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <HeartPulse className="h-4 w-4 text-destructive" /> Live urgent feed
          </div>
        </section>

        {bannerAds[0] && (
          <section className="mx-6 mt-4 md:mx-0">
            <NativeAdCard ad={bannerAds[0]} variant="banner" />
          </section>
        )}

        {/* HOW IT WORKS */}
        <section className="px-6 py-10 md:px-0 md:py-16">
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">How it works</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">Get help in three simple steps</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { step: "01", title: "Search nearby", text: "Tell us what you need — we surface trusted local options." },
              { step: "02", title: "Connect instantly", text: "Chat or call directly. No middlemen, no commissions." },
              { step: "03", title: "Get it done", text: "Hire, review, and grow your trusted local network." },
            ].map((s) => (
              <div key={s.step} className="rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <span className="text-xs font-bold tracking-wider text-primary">{s.step}</span>
                <p className="mt-2 text-base font-bold text-card-foreground">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WHY US */}
        <section className="px-6 pb-10 md:px-0 md:pb-16">
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why NearKonnect</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">A smarter way to find local help</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {trustPoints.map((item) => (
              <div key={item.title} className="rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="font-bold text-card-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="mx-6 mb-12 overflow-hidden rounded-[2rem] bg-hero p-6 text-hero-foreground md:mx-0 md:p-10">
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Ready to connect with your community?</h2>
              <p className="mt-2 text-sm text-hero-muted md:text-base">
                Join thousands using NearKonnect to find trusted help, offer services, and respond to urgent local needs.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <RoleSelectDialog>
                  <Button>Create free account</Button>
                </RoleSelectDialog>
                <Button variant="outline" className="border-white/20 bg-transparent text-hero-foreground hover:bg-white/10" onClick={() => navigate("/discover")}>
                  Browse services
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Active clients", value: "1.2k+" },
                { label: "Urgent requests", value: "Live" },
                { label: "Categories", value: "20+" },
                { label: "Avg response", value: "< 5m" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/5">
                  <p className="text-lg font-bold text-hero-foreground">{stat.value}</p>
                  <p className="text-xs text-hero-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
