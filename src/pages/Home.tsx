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
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCategories } from "@/hooks/useCategories";
import type { Worker } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { calculateDistance } from "@/lib/geolocation";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import { useFeaturedWorkerIds, useNativeAds } from "@/hooks/useSponsored";
import NativeAdCard from "@/components/NativeAdCard";
import FeaturedWorkersCarousel from "@/components/FeaturedWorkersCarousel";
import { useAdminUserIds } from "@/hooks/useAdminUserIds";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

const MAX_RADIUS_KM = 20;

import { useWorkers } from "@/hooks/useWorkers";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { coords: browsingCoords, status: locationStatus, refresh: refreshLocation } = useRealtimeLocation();
  const { data: allWorkers = [], isLoading: workersLoading } = useWorkers();
  const featuredIds = useFeaturedWorkerIds();
  const feedAds = useNativeAds("home_feed", browsingCoords);
  const inlineAds = useNativeAds("home_inline", browsingCoords);
  const adminUserIds = useAdminUserIds();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  const workers = useMemo(() => {
    // Only include workers who completed category setup (no placeholders)
    // and exclude any users who hold the admin role.
    return allWorkers
      .filter((w) => w.userId !== user?.id)
      .filter((w) => !adminUserIds.has(w.userId))
      .filter((w) => !!w.mainCategory && !!w.subCategory);
  }, [allWorkers, user?.id, adminUserIds]);

  const loading = workersLoading;

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
      const main = (w.mainCategory || "").toLowerCase();
      const sub = (w.subCategory || "").toLowerCase();
      return words.every((word) => 
        name.includes(word) || 
        prof.includes(word) || 
        main.includes(word) || 
        sub.includes(word)
      );
    });

    return keywordFiltered
      .map((w) => {
        if (typeof w.latitude !== "number" || typeof w.longitude !== "number") {
          return { ...w, distance: Number.POSITIVE_INFINITY };
        }
        const distance = browsingCoords
          ? calculateDistance(browsingCoords.latitude, browsingCoords.longitude, w.latitude, w.longitude)
          : 0;
        return { ...w, distance: parseFloat(distance.toFixed(1)) };
      })
      .filter((w) => {
        // Only show workers within 10km by default if location is available
        if (browsingCoords && w.distance !== Number.POSITIVE_INFINITY) {
          return w.distance <= 10;
        }
        return true;
      })
      .sort((a, b) => {
        // First sort by featured status
        const aF = featuredIds.has(a.id) ? 1 : 0;
        const bF = featuredIds.has(b.id) ? 1 : 0;
        if (aF !== bF) return bF - aF;
        // Then sort by distance
        return a.distance - b.distance;
      });
  }, [search, workers, browsingCoords, featuredIds]);

  const { mainCategories, isLoading: categoriesLoading } = useCategories();

  const mainCategoryMeta = useMemo(() => {
    const defaults = [
      { name: "Home & Local Services", icon: HomeIcon, emoji: "🏠" },
      { name: "Automotive & Transport", icon: Car, emoji: "🚗" },
      { name: "Shops, Food & Daily Needs", icon: ShoppingBag, emoji: "🛍️" },
      { name: "Professional & Business Services", icon: Briefcase, emoji: "💼" },
      { name: "Health, Education & Community", icon: HeartPulse, emoji: "🏥" },
      { name: "Events & Lifestyle", icon: Sparkles, emoji: "✨" },
    ];

    return mainCategories.map((cat) => {
      const found = defaults.find((d) => d.name === cat.name);
      return {
        name: cat.name,
        icon: found ? found.icon : Compass,
        emoji: cat.icon || (found ? found.emoji : "🔧"),
      };
    });
  }, [mainCategories]);

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
            className="tap-feedback group relative overflow-hidden rounded-3xl bg-hero p-5 text-left text-hero-foreground transition-transform hover:-translate-y-0.5"
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
            <HeartPulse className="relative mb-3 h-6 w-6 text-primary" />
            <p className="relative text-base font-bold">Urgent Help</p>
            <p className="relative mt-0.5 text-xs text-hero-muted">Blood & emergency support</p>
            <ArrowRight className="relative mt-3 h-4 w-4 text-hero-muted transition-transform group-hover:translate-x-1" />
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

        {/* INLINE AD (subtle, between sections) */}
        {inlineAds[0] && (
          <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2.5}>
            <NativeAdCard ad={inlineAds[0]} variant="inline" viewerCoords={browsingCoords} />
          </motion.section>
        )}

        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2.8}>
          <FeaturedWorkersCarousel />
        </motion.section>

        {/* NEARBY */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Nearby Services</h2>
              <p className="text-xs text-muted-foreground">Trusted professionals available to help you</p>
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
                <WorkerCard
                  key={`nearby-${w.id}-${i}`}
                  worker={w}
                  index={i}
                  sponsored={featuredIds.has(w.id)}
                />
              ))}
              {feedAds[0] && (
                <div className="md:col-span-2 xl:col-span-3">
                  <NativeAdCard ad={feedAds[0]} variant="feed" viewerCoords={browsingCoords} />
                </div>
              )}
            </div>
          )}
        </motion.section>

        {/* CATEGORIES */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={4}>
          <div className="relative overflow-hidden rounded-3xl bg-hero p-5 text-hero-foreground md:p-6">
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{
              backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }} />

            <div className="relative space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-hero-muted">
                    <Sparkles className="h-3 w-3 text-primary" /> Categories
                  </span>
                  <p className="mt-2 text-lg font-bold tracking-tight">Browse by category</p>
                  <p className="text-xs text-hero-muted">Pick a category to narrow your search</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/discover")}
                  className="h-7 gap-1 px-2 text-xs text-hero-foreground hover:bg-white/10"
                >
                  All <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {mainCategoryMeta.slice(0, showAllCategories ? undefined : 5).map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.name}
                      type="button"
                      onClick={() => navigate(`/discover?main_category=${encodeURIComponent(category.name)}`)}
                      className="tap-feedback group flex items-center gap-3 rounded-2xl bg-white/5 p-3 text-left text-hero-foreground ring-1 ring-white/10 transition-all hover:bg-white/10"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-primary transition-colors group-hover:bg-white/15">
                        {category.emoji ? (
                          <span className="text-lg">{category.emoji}</span>
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </span>
                      <span className="text-sm font-bold leading-tight line-clamp-2">{category.name}</span>
                    </button>
                  );
                })}
                {mainCategoryMeta.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="tap-feedback group flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-left text-hero-foreground ring-1 ring-white/20 transition-all hover:bg-white/20"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform">
                      {showAllCategories ? (
                        <ArrowRight className="h-5 w-5 -rotate-90" />
                      ) : (
                        <ArrowRight className="h-5 w-5 rotate-90" />
                      )}
                    </span>
                    <span className="text-sm font-bold leading-tight">
                      {showAllCategories ? "Show Less" : "Show All"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </section>
    </AppLayout>
  );
};

export default Home;
