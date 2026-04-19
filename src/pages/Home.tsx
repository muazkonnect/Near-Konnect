import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Car, Compass, HeartPulse, Home as HomeIcon, MapPin, Navigation, Search, ShoppingBag, Sparkles, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import WorkerCard from "@/components/WorkerCard";
import ActiveBloodRequests from "@/components/ActiveBloodRequests";
import { workers as mockWorkers } from "@/data/mockData";
import { MAIN_SERVICE_CATEGORIES } from "@/data/serviceCategories";
import { supabase } from "@/integrations/supabase/client";
import type { Worker } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { calculateDistance } from "@/lib/geolocation";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

const MAX_RADIUS_KM = 20;

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { coords: browsingCoords, status: locationStatus, refresh: refreshLocation } = useRealtimeLocation();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      const workersRes = await supabase
        .from("workers")
        .select("*, profiles!workers_user_id_fkey_profiles(full_name, phone, avatar_url)")
        .eq("available", true)
        .order("experience", { ascending: false })
        .limit(24);

      const workerData = workersRes.data || [];
      const workerIds = workerData.map((w) => w.id);
      const { data: reviewData } = workerIds.length
        ? await supabase.from("reviews").select("worker_id, rating").in("worker_id", workerIds)
        : { data: [] as Array<{ worker_id: string; rating: number }> };

      const reviewMap: Record<string, { sum: number; count: number }> = {};
      reviewData?.forEach((r) => {
        if (!reviewMap[r.worker_id]) reviewMap[r.worker_id] = { sum: 0, count: 0 };
        reviewMap[r.worker_id].sum += r.rating;
        reviewMap[r.worker_id].count += 1;
      });

      const mapDbWorker = (w: any): Worker => {
        const profile = w.profiles as any;
        const rev = reviewMap[w.id];
        return {
          id: w.id,
          name: profile?.full_name || "Worker",
          profession: w.profession,
          rating: rev ? Math.round((rev.sum / rev.count) * 10) / 10 : 0,
          reviewCount: rev?.count || 0,
          experience: w.experience,
          distance: 0,
          available: w.available,
          verified: w.verified,
          phone: profile?.phone || "",
          description: w.description || "",
          serviceAreas: w.service_areas || [],
          profilePhoto: profile?.avatar_url || "",
          city: w.city || "",
          latitude: w.latitude ?? undefined,
          longitude: w.longitude ?? undefined,
        };
      };

      const mapped = workerData.filter((w) => w.user_id !== user?.id).map(mapDbWorker);
      setWorkers(mapped);
      setLoading(false);
    };
    fetchWorkers();
  }, [user?.id]);

  const workerSuggestions = useMemo(() => {
    const cityList = [...new Set(workers.map((w) => w.city).filter(Boolean))].slice(0, 3);
    const professionList = [...new Set(workers.map((w) => w.profession).filter(Boolean))].slice(0, 4);
    return [...professionList, ...cityList];
  }, [workers]);

  const nearbyWorkers = useMemo(() => {
    const q = search.toLowerCase().trim();
    const words = q ? q.split(/\s+/) : [];

    const keywordFiltered = workers.filter((w) => {
      if (!words.length) return true;
      const name = w.name.toLowerCase();
      const prof = w.profession.toLowerCase();
      return words.every((word) => name.includes(word) || prof.includes(word));
    });

    if (!browsingCoords) {
      return keywordFiltered.slice(0, 8).map((w) => ({ ...w, distance: 0 }));
    }

    return keywordFiltered
      .map((w) => {
        if (typeof w.latitude !== "number" || typeof w.longitude !== "number") {
          return { ...w, distance: Number.POSITIVE_INFINITY };
        }
        const distance = calculateDistance(browsingCoords.latitude, browsingCoords.longitude, w.latitude, w.longitude);
        return { ...w, distance: parseFloat(distance.toFixed(1)) };
      })
      .filter((w) => Number.isFinite(w.distance) && w.distance <= MAX_RADIUS_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);
  }, [search, workers, browsingCoords]);

  const mainCategoryMeta = [
    { name: "Home & Local Services", icon: HomeIcon, accent: "from-primary/20 to-primary/5" },
    { name: "Automotive & Transport", icon: Car, accent: "from-blue-500/20 to-blue-500/5" },
    { name: "Shops, Food & Daily Needs", icon: ShoppingBag, accent: "from-orange-500/20 to-orange-500/5" },
    { name: "Professional & Business Services", icon: Briefcase, accent: "from-purple-500/20 to-purple-500/5" },
    { name: "Health, Education & Community", icon: HeartPulse, accent: "from-destructive/20 to-destructive/5" },
    { name: "Events & Lifestyle", icon: Sparkles, accent: "from-pink-500/20 to-pink-500/5" },
  ] as const;

  useEffect(() => {
    if (!search.trim()) {
      setSuggestions(workerSuggestions.slice(0, 4));
      return;
    }
    const q = search.toLowerCase();
    setSuggestions(workerSuggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 4));
  }, [search, workerSuggestions]);

  return (
    <AppLayout title="" subtitle="">
      <section className="space-y-8">
        {/* HERO SEARCH */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="relative -mt-16 overflow-hidden rounded-[2rem] bg-hero p-5 text-hero-foreground shadow-premium md:-mt-20 md:p-8"
        >
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{
            backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }} />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-hero-muted">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live nearby
              </span>
              <span className="text-[11px] font-medium text-hero-muted">{new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>
            </div>

            <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight md:text-3xl">
              What do you need help with <span className="text-primary">today?</span>
            </h2>

            <form
              onSubmit={(e) => { e.preventDefault(); navigate(`/discover?search=${encodeURIComponent(search)}`); }}
              className="mt-5 flex items-center gap-1 rounded-full bg-white/10 p-1.5 pl-2 ring-1 ring-white/10 backdrop-blur-sm focus-within:ring-primary/40"
            >
              <Search className="ml-1 h-4 w-4 shrink-0 text-hero-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Try 'Electrician'..."
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-hero-foreground placeholder:text-hero-muted focus:outline-none"
              />
              <Button type="submit" size="sm" className="h-9 shrink-0 rounded-full px-3 sm:px-4">Search</Button>
            </form>

            {suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-hero-muted">Try:</span>
                {suggestions.slice(0, 4).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setSearch(suggestion);
                      navigate(`/discover?search=${encodeURIComponent(suggestion)}`);
                    }}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-hero-muted hover:bg-white/10 hover:text-hero-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-[11px] text-hero-muted ring-1 ring-white/5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {locationStatus === "denied" ? (
                <span>Enable location to see nearby help</span>
              ) : browsingCoords ? (
                <span className="truncate">Using current location · {browsingCoords.latitude.toFixed(2)}, {browsingCoords.longitude.toFixed(2)}</span>
              ) : (
                <span>Detecting location...</span>
              )}
              <Button type="button" variant="ghost" size="sm" className="ml-auto h-6 gap-1 px-2 text-[11px] text-hero-foreground hover:bg-white/10" onClick={refreshLocation}>
                <Navigation className="h-3 w-3" /> Update
              </Button>
            </div>
          </div>
        </motion.div>

        {/* QUICK ACTIONS */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <button
            onClick={() => navigate("/discover")}
            className="tap-feedback group rounded-3xl bg-primary p-5 text-left text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <UserSearch className="mb-3 h-6 w-6" />
            <p className="text-base font-bold">Find a Service</p>
            <p className="mt-0.5 text-xs opacity-80">Trusted people near you</p>
            <ArrowRight className="mt-3 h-4 w-4 opacity-70 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate("/blood-donors")}
            className="tap-feedback group rounded-3xl bg-hero p-5 text-left text-hero-foreground transition-transform hover:-translate-y-0.5"
          >
            <HeartPulse className="mb-3 h-6 w-6 text-primary" />
            <p className="text-base font-bold">Urgent Help</p>
            <p className="mt-0.5 text-xs text-hero-muted">Blood & emergency support</p>
            <ArrowRight className="mt-3 h-4 w-4 text-hero-muted transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate("/discover")}
            className="tap-feedback group rounded-3xl border bg-card p-5 text-left transition-transform hover:-translate-y-0.5 hover:border-foreground/15"
          >
            <Compass className="mb-3 h-6 w-6 text-foreground" />
            <p className="text-base font-bold text-foreground">Categories</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Browse all services</p>
            <ArrowRight className="mt-3 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>

        {/* URGENT FEED */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Urgent Help Feed</h2>
              <p className="text-xs text-muted-foreground">Live community emergencies near you</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/blood-donors")} className="gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <ActiveBloodRequests compact hideTitle />
        </motion.section>

        {/* NEARBY */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Nearby Services</h2>
              <p className="text-xs text-muted-foreground">Top-rated workers within {MAX_RADIUS_KM} km</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/discover")} className="gap-1">
              Explore <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-3xl border bg-muted" />
              ))}
            </div>
          ) : nearbyWorkers.length === 0 ? (
            <div className="rounded-3xl border bg-muted/30 p-8 text-center">
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold text-foreground">No matching services yet</p>
              <p className="text-sm text-muted-foreground">Try another search or browse categories.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {nearbyWorkers.map((w, i) => (
                <WorkerCard key={`nearby-${w.id}-${i}`} worker={w} index={i} />
              ))}
            </div>
          )}
        </motion.section>

        {/* CATEGORIES */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={4}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Browse by category</h2>
              <p className="text-xs text-muted-foreground">All services, organized by what you need</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/discover")} className="gap-1">
              All <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {mainCategoryMeta.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.name}
                  onClick={() => navigate(`/discover?mainCategory=${encodeURIComponent(category.name)}`)}
                  className={`tap-feedback group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border bg-gradient-to-br ${category.accent} p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-card text-primary ring-1 ring-border transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-4 w-4 text-primary-foreground bg-secondary-foreground" />
                  </span>
                  <p className="text-sm font-bold leading-tight text-foreground">{category.name}</p>
                </button>
              );
            })}
          </div>
        </motion.section>
      </section>
    </AppLayout>
  );
};

export default Home;
