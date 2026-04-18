import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Briefcase, Globe, HeartPulse, MapPin, Search, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Home from "@/pages/Home";
import heroBubbles from "@/assets/hero-bubbles.png";

const slides = [
  {
    title: ["Find help or", "offer your skills"],
    description: "Connect with local professionals in real-time or start earning by providing services in your area.",
  },
  {
    title: ["Trusted local", "service network"],
    description: "Verified profiles, real reviews, and instant chat — get matched with helpers around you in seconds.",
  },
  {
    title: ["Urgent help,", "fast response"],
    description: "From blood requests to emergency repairs, your community responds when you need it most.",
  },
];

const actions = [
  {
    icon: Search,
    title: "Find a Service",
    subtitle: "I need to hire a local professional",
    to: "/discover",
  },
  {
    icon: Briefcase,
    title: "Become a Worker",
    subtitle: "I want to offer my services & earn",
    to: "/register?role=worker",
  },
  {
    icon: HeartPulse,
    title: "Urgent / Blood Help",
    subtitle: "Request or respond to emergencies",
    to: "/blood-donors",
  },
];

const trustPoints = [
  { icon: ShieldCheck, title: "Verified profiles", text: "Real identities, ratings and reviews from your community." },
  { icon: Sparkles, title: "Instant matching", text: "Smart suggestions based on your location and needs." },
  { icon: HeartPulse, title: "Emergency ready", text: "Urgent and blood requests stand out and respond fast." },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlideIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  if (!loading && user) return <Home />;

  const slide = slides[slideIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* HERO + ACTIONS */}
      <main className="mx-auto w-full max-w-md md:max-w-7xl md:px-6 md:pt-6">
        <div className="flex flex-col md:grid md:grid-cols-2 md:gap-10 md:items-stretch">
          {/* Dark hero */}
          <section className="relative overflow-hidden rounded-b-[2.5rem] bg-hero px-6 pb-12 pt-7 text-hero-foreground md:rounded-[2rem] md:p-10">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                <span>NearKonnect</span>
              </div>
              <button className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-hero-foreground hover:bg-white/15">
                <Globe className="h-3.5 w-3.5" /> EN
              </button>
            </div>

            <div className="mt-8 flex justify-center md:mt-12">
              <motion.img
                key={slideIndex}
                src={heroBubbles}
                alt="Iridescent bubbles"
                width={1024}
                height={1024}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="h-56 w-56 object-contain md:h-80 md:w-80"
              />
            </div>

            <div className="mt-8 md:mt-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slideIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  <h1 className="text-center text-3xl font-bold leading-tight tracking-tight md:text-left md:text-4xl">
                    {slide.title[0]}
                    <br />
                    {slide.title[1]}
                  </h1>
                  <p className="mx-auto mt-3 max-w-sm text-center text-sm text-hero-muted md:mx-0 md:text-left md:text-base">
                    {slide.description}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex justify-center gap-1.5 md:justify-start">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === slideIndex ? "w-8 bg-hero-foreground" : "w-4 bg-white/25 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Action cards */}
          <section className="flex flex-col gap-3 px-6 pb-10 pt-6 md:justify-center md:p-0">
            <div className="hidden md:mb-2 md:block">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Get started</p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">What brings you here today?</h2>
            </div>

            {actions.map((action, idx) => (
              <motion.button
                key={action.title}
                onClick={() => navigate(action.to)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                className="group flex items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-lg md:p-5"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-card-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.subtitle}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
              </motion.button>
            ))}

            <div className="mt-2 rounded-3xl bg-muted/60 p-4 md:p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Already a member?</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/login")}>
                  Log In
                </Button>
                <Button className="flex-1" onClick={() => navigate("/register")}>
                  Sign Up
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* SOCIAL PROOF STRIP */}
        <section className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card px-5 py-4 md:mx-0 md:mt-12">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" />
            1,200+ active members
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <Star className="h-4 w-4 fill-star text-star" />
            4.9 avg rating
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Verified profiles
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <HeartPulse className="h-4 w-4 text-destructive" />
            Live urgent feed
          </div>
        </section>

        {/* WHY US */}
        <section className="px-6 py-10 md:px-0 md:py-16">
          <div className="mb-6 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why NearKonnect</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">A smarter way to find local help</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {trustPoints.map((item) => (
              <div key={item.title} className="rounded-3xl border bg-card p-5">
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
                <Button onClick={() => navigate("/register")}>Create free account</Button>
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
                <div key={stat.label} className="rounded-2xl bg-white/5 p-4">
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
