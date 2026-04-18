import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Briefcase, Globe, HeartPulse, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
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
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col md:max-w-6xl">
        {/* Mobile-first stacked layout, desktop side-by-side */}
        <div className="flex flex-1 flex-col md:grid md:grid-cols-2 md:gap-8 md:p-6">
          {/* Dark hero */}
          <section className="relative overflow-hidden rounded-b-[2.5rem] bg-hero px-6 pb-10 pt-7 text-hero-foreground md:rounded-3xl md:p-8">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                <span>NearKonnect</span>
              </div>
              <button className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-hero-foreground">
                <Globe className="h-3.5 w-3.5" /> EN
              </button>
            </div>

            <div className="mt-6 flex justify-center md:mt-10">
              <img
                src={heroBubbles}
                alt="Iridescent bubbles"
                width={1024}
                height={1024}
                className="h-56 w-56 object-contain md:h-80 md:w-80"
              />
            </div>

            <div className="mt-6 md:mt-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slideIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  <h1 className="text-center text-3xl font-bold leading-tight md:text-left md:text-4xl">
                    {slide.title[0]}
                    <br />
                    {slide.title[1]}
                  </h1>
                  <p className="mt-3 text-center text-sm text-hero-muted md:text-left">{slide.description}</p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex justify-center gap-1.5 md:justify-start">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === slideIndex ? "w-8 bg-hero-foreground" : "w-4 bg-white/25"
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Action cards */}
          <section className="flex flex-col gap-3 px-6 pb-10 pt-6 md:justify-center md:p-0">
            {actions.map((action, idx) => (
              <motion.button
                key={action.title}
                onClick={() => navigate(action.to)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                className="group flex items-center gap-4 rounded-3xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg md:p-5"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-card-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.subtitle}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
              </motion.button>
            ))}

            <div className="mt-2 flex flex-col gap-2 rounded-3xl bg-muted/50 p-4 md:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Already a member?</p>
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

        <Footer />
      </main>
    </div>
  );
};

export default Index;
