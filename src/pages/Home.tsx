import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Compass, HeartPulse, MapPin, Navigation, Search, Sparkles, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import WorkerCard from "@/components/WorkerCard";
import MonetizedWorkerGrid from "@/components/MonetizedWorkerGrid";
import type { NativeAd } from "@/components/NativeAdCard";
import NativeAdCard from "@/components/NativeAdCard";
import ActiveBloodRequests from "@/components/ActiveBloodRequests";
import { serviceCategories, workers as mockWorkers } from "@/data/mockData";
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

const placeholderFeedAd: NativeAd = {
  id: "placeholder-ad",
  title: "Your Ad Here",
  description: "Promote your business to local clients with native placements.",
  image_url: null,
  cta_label: "Learn More",
  cta_url: "#",
};

const placeholderBannerAd: NativeAd = {
  id: "placeholder-banner",
  title: "Advertise Your Business Here",
  description: "Reach nearby clients right where they discover services.",
  image_url: null,
  cta_label: "Learn More",
  cta_url: "#",
};

const shuffleArray = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const MAX_RADIUS_KM = 20;

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [featuredWorkers, setFeaturedWorkers] = useState<Array<Worker & { isSponsored?: boolean }>>(
    mockWorkers.slice(0, 3).map((w) => ({ ...w, isSponsored: true })),
  );
  const [feedAds, setFeedAds] = useState<NativeAd[]>([placeholderFeedAd]);
  const [bannerAd, setBannerAd] = useState<NativeAd>(placeholderBannerAd);
  const { coords: browsingCoords, status: locationStatus, refresh: refreshLocation } = useRealtimeLocation();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      const [workersRes, featuredRes, adsRes] = await Promise.all([
        supabase
          .from("workers")
          .select("*, profiles!workers_user_id_fkey_profiles(full_name, phone, avatar_url)")
          .eq("available", true)
          .order("experience", { ascending: false })
          .limit(24),
        (supabase as any)
          .from("featured_services")
          .select("id, service_id, priority, rotation_seed")
          .eq("is_active", true)
          .order("priority", { ascending: false }),
        (supabase as any)
          .from("native_ads")
          .select("id,title,description,image_url,cta_label,cta_url,placement,priority")
          .eq("is_active", true)
          .order("priority", { ascending: false }),
      ]);

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

      const featuredRows = (featuredRes.data || []) as Array<{ service_id: string }>;
      const featuredIds = [...new Set(featuredRows.map((row) => row.service_id))];

      let featuredPool = mapped.filter((w) => featuredIds.includes(w.id));
      const missingFeaturedIds = featuredIds.filter((id) => !featuredPool.some((w) => w.id === id));

      if (missingFeaturedIds.length) {
        const { data: missingRows } = await supabase
          .from("workers")
          .select("*, profiles!workers_user_id_fkey_profiles(full_name, phone, avatar_url)")
          .in("id", missingFeaturedIds);
        featuredPool = [...featuredPool, ...((missingRows || []).map(mapDbWorker) as Worker[])];
      }

      const regularPool = [...mapped, ...mockWorkers].filter(
        (candidate, i, arr) => arr.findIndex((w) => w.id === candidate.id) === i,
      );
      const featuredCombined = [
        ...shuffleArray(featuredPool).map((w) => ({ ...w, isSponsored: true })),
        ...regularPool.filter((w) => !featuredPool.some((s) => s.id === w.id)).map((w) => ({ ...w, isSponsored: true })),
      ].slice(0, 3);
      setFeaturedWorkers(featuredCombined.length ? featuredCombined : mockWorkers.slice(0, 3).map((w) => ({ ...w, isSponsored: true })));

      const ads = (adsRes.data || []) as Array<NativeAd & { placement: string; priority?: number }>;
      const homepageFeedAds = ads.filter((ad) => ["home_feed", "discover_feed", "search_results"].includes(ad.placement));
      const homepageBanner = ads.find((ad) => ad.placement === "home_banner");
      setFeedAds(homepageFeedAds.length ? homepageFeedAds : [placeholderFeedAd]);
      setBannerAd(homepageBanner || placeholderBannerAd);

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
      return words.every(
        (word) =>
          name.includes(word) ||
          prof.includes(word)
      );
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

  const quickCategories = [
    { id: "electrician", name: "Electrician", icon: "⚡" },
    { id: "plumber", name: "Plumber", icon: "🔧" },
    { id: "tutor", name: "Tutor", icon: "📚" },
    { id: "delivery", name: "Delivery", icon: "🛵" },
    { id: "blood-donors", name: "Blood Donation", icon: "🩸", urgent: true },
  ];

  useEffect(() => {
    if (!search.trim()) {
      setSuggestions(workerSuggestions.slice(0, 4));
      return;
    }
    const q = search.toLowerCase();
    setSuggestions(workerSuggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 4));
  }, [search, workerSuggestions]);

  return (
    <AppLayout
      title={`Welcome back, ${firstName}`}
      subtitle="Find local help in seconds — services, urgent requests, and trusted nearby services."
      action={
        <Button className="h-10 rounded-xl" onClick={() => navigate("/blood-donors")}>
          Request Help
        </Button>
      }
    >
      <section className="space-y-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="rounded-3xl border bg-muted/40 p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find services near you..."
              className="h-12 rounded-2xl bg-card pl-10 text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate(`/discover?search=${encodeURIComponent(search)}`);
              }}
            />
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setSearch(suggestion);
                  navigate(`/discover?search=${encodeURIComponent(suggestion)}`);
                }}
                className="tap-feedback shrink-0 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {locationStatus === "denied" ? (
              <span>Please enable location to continue</span>
            ) : browsingCoords ? (
              <span>Using your current location · {browsingCoords.latitude.toFixed(3)}, {browsingCoords.longitude.toFixed(3)}</span>
            ) : (
              <span>Detecting your current location...</span>
            )}
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={refreshLocation}>
              <Navigation className="h-3 w-3" /> Update my location
            </Button>
          </div>

          <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
            {bannerAd.image_url ? (
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={bannerAd.image_url}
                  alt={bannerAd.title}
                  className="h-28 w-full object-cover sm:h-32"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-background/90 to-transparent p-3">
                  <p className="text-sm font-semibold text-foreground">{bannerAd.title || "Advertise Your Business Here"}</p>
                  <Button asChild size="sm" variant="secondary" className="rounded-lg">
                    <a href={bannerAd.cta_url} target="_blank" rel="noreferrer">{bannerAd.cta_label || "Learn More"}</a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-base font-semibold text-foreground">Advertise Your Business Here</p>
                  <p className="text-sm text-muted-foreground">Show your brand inside NearKonnect with native sponsored placements.</p>
                </div>
                <Button asChild className="rounded-xl">
                  <a href={bannerAd.cta_url} target="_blank" rel="noreferrer">{bannerAd.cta_label || "Learn More"}</a>
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button onClick={() => navigate("/discover")} className="tap-feedback rounded-2xl border bg-card p-4 text-left">
            <UserSearch className="mb-2 h-5 w-5 text-primary" />
            <p className="font-semibold text-foreground">Find a Service</p>
            <p className="text-xs text-muted-foreground">Trusted people near your location</p>
          </button>
          <button onClick={() => navigate("/blood-donors")} className="tap-feedback rounded-2xl border bg-card p-4 text-left">
            <HeartPulse className="mb-2 h-5 w-5 text-destructive" />
            <p className="font-semibold text-foreground">Request Urgent Help</p>
            <p className="text-xs text-muted-foreground">Blood and emergency support fast</p>
          </button>
          <button onClick={() => navigate("/discover")} className="tap-feedback rounded-2xl border bg-card p-4 text-left">
            <Compass className="mb-2 h-5 w-5 text-secondary" />
            <p className="font-semibold text-foreground">Browse Categories</p>
            <p className="text-xs text-muted-foreground">Explore services by type</p>
          </button>
        </motion.div>

        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Urgent Help Feed</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/blood-donors")} className="gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <ActiveBloodRequests compact hideTitle />
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Featured Workers</h2>
            <Badge variant="outline" className="rounded-full">Sponsored</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {featuredWorkers.slice(0, 3).map((w, i) => (
              <WorkerCard key={`featured-${w.id}-${i}`} worker={w} index={i} sponsored />
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={4}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Nearby Services</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/discover")} className="gap-1">
              Explore <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl border bg-muted" />
              ))}
            </div>
          ) : nearbyWorkers.length === 0 ? (
            <div className="space-y-4">
              <NativeAdCard ad={feedAds[0] || placeholderFeedAd} />
              <div className="rounded-2xl border bg-muted/30 p-8 text-center">
                <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-semibold text-foreground">No matching services yet</p>
                <p className="text-sm text-muted-foreground">Try another search or browse categories.</p>
              </div>
            </div>
          ) : (
            <MonetizedWorkerGrid
              workers={nearbyWorkers.map((w) => ({ ...w, isSponsored: featuredWorkers.some((f) => f.id === w.id) }))}
              ads={feedAds.length ? feedAds : [placeholderFeedAd]}
              adFrequencyMin={4}
            />
          )}
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <h2 className="mb-3 text-lg font-bold text-foreground">Categories</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {quickCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => navigate(category.id === "blood-donors" ? "/blood-donors" : `/discover?category=${category.id}`)}
                className="tap-feedback rounded-2xl border bg-card p-3 text-left"
              >
                <div className="mb-1.5 text-xl">{category.icon}</div>
                <p className="text-sm font-semibold text-foreground">{category.name}</p>
                {category.urgent && (
                  <Badge variant="destructive" className="mt-2 rounded-full px-2 py-0 text-[10px]">
                    Urgent
                  </Badge>
                )}
              </button>
            ))}
            {serviceCategories.slice(0, 5).map((category) => (
              <button
                key={category.id}
                onClick={() => navigate(`/discover?category=${category.id}`)}
                className="tap-feedback rounded-2xl border bg-card p-3 text-left"
              >
                <div className="mb-1.5 text-xl">{category.icon}</div>
                <p className="text-sm font-semibold text-foreground">{category.name}</p>
              </button>
            ))}
          </div>
        </motion.section>
      </section>
    </AppLayout>
  );
};

export default Home;
