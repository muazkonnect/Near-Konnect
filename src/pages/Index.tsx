import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Compass, HeartPulse, MapPin, MessageSquare, Navigation, Search, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import WorkerCard from "@/components/WorkerCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { serviceCategories, workers as mockWorkers } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import type { Worker } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import Home from "@/pages/Home";
import { calculateDistance } from "@/lib/geolocation";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

const quickCategories = [
  { id: "electrician", name: "Electrician", icon: "⚡" },
  { id: "plumber", name: "Plumber", icon: "🔧" },
  { id: "tutor", name: "Tutor", icon: "📚" },
  { id: "delivery", name: "Delivery", icon: "🛵" },
  { id: "blood-donors", name: "Blood Donation", icon: "🩸", urgent: true },
];

const MAX_RADIUS_KM = 20;

const Index = () => {
  const navigate = useNavigate();
  const [topWorkers, setTopWorkers] = useState<Worker[]>(mockWorkers.slice(0, 6));
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { user, loading } = useAuth();
  const { coords: browsingCoords, status: locationStatus, refresh: refreshLocation } = useRealtimeLocation();

  useEffect(() => {
    const fetchWorkers = async () => {
      const { data } = await supabase
        .from("workers")
        .select("*, profiles!workers_user_id_fkey_profiles(full_name, phone, avatar_url)")
        .eq("available", true)
        .order("experience", { ascending: false })
        .limit(6);

      if (data) {
        const workerIds = data.map((w) => w.id);
        const { data: reviewData } = await supabase
          .from("reviews")
          .select("worker_id, rating")
          .in("worker_id", workerIds);

        const reviewMap: Record<string, { sum: number; count: number }> = {};
        reviewData?.forEach((r) => {
          if (!reviewMap[r.worker_id]) reviewMap[r.worker_id] = { sum: 0, count: 0 };
          reviewMap[r.worker_id].sum += r.rating;
          reviewMap[r.worker_id].count += 1;
        });

        const mapped = data.map((w) => {
          const profile = w.profiles as any;
          const rev = reviewMap[w.id];
          return {
            id: w.id,
            name: profile?.full_name || "Service",
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
        });

        setTopWorkers(mapped);
      }
    };
    fetchWorkers();
  }, []);

  const nearbyWorkers = useMemo(() => {
    const source = topWorkers.length > 0 ? topWorkers : mockWorkers.slice(0, 6);

    if (!browsingCoords) {
      return source.slice(0, 6).map((w) => ({ ...w, distance: 0 }));
    }

    return source
      .map((w) => {
        if (typeof w.latitude !== "number" || typeof w.longitude !== "number") {
          return { ...w, distance: Number.POSITIVE_INFINITY };
        }
        const distance = calculateDistance(browsingCoords.latitude, browsingCoords.longitude, w.latitude, w.longitude);
        return { ...w, distance: parseFloat(distance.toFixed(1)) };
      })
      .filter((w) => Number.isFinite(w.distance) && w.distance <= MAX_RADIUS_KM)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
  }, [topWorkers, browsingCoords]);

  const workerSuggestions = useMemo(() => {
    const professions = [...new Set(topWorkers.map((w) => w.profession).filter(Boolean))].slice(0, 3);
    return professions;
  }, [topWorkers]);

  useEffect(() => {
    if (!search.trim()) {
      setSuggestions(workerSuggestions);
      return;
    }
    const q = search.toLowerCase();
    setSuggestions(workerSuggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 4));
  }, [search, workerSuggestions]);

  if (!loading && user) {
    return <Home />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] space-y-8 px-4 pb-28 pt-4 md:pb-12 md:pt-8">
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={0} className="overflow-hidden rounded-3xl border bg-card p-5 md:p-8">
          <Badge className="mb-3 rounded-full">Local Help & Emergency Network</Badge>
          <h1 className="mb-2 max-w-3xl text-3xl font-bold leading-tight text-foreground md:text-5xl">Find nearby help in seconds</h1>
          <p className="mb-5 max-w-2xl text-sm text-muted-foreground md:text-base">From trusted workers to urgent blood requests, NearKonnect helps your community respond fast.</p>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find services near you..."
              className="h-12 rounded-2xl bg-background pl-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate(`/discover?search=${encodeURIComponent(search)}`);
              }}
            />
          </div>

          <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => navigate(`/discover?search=${encodeURIComponent(suggestion)}`)}
                className="tap-feedback shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {locationStatus === "denied" ? (
              <span>Please enable location to continue</span>
            ) : browsingCoords ? (
              <span>Using your current location ({browsingCoords.latitude.toFixed(2)}, {browsingCoords.longitude.toFixed(2)})</span>
            ) : (
              <span>Detecting current location...</span>
            )}
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={refreshLocation}>
              <Navigation className="h-3 w-3" /> Update my location
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Button className="h-11 justify-start rounded-xl" onClick={() => navigate("/discover")}>Find a Service</Button>
            <Button variant="outline" className="h-11 justify-start rounded-xl" onClick={() => navigate("/blood-donors")}>Request Urgent Help</Button>
            <Button variant="secondary" className="h-11 justify-start rounded-xl" onClick={() => navigate("/discover")}>Browse Categories</Button>
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Quick Categories</h2>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/discover")}>Explore <ArrowRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {quickCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => navigate(category.id === "blood-donors" ? "/blood-donors" : `/discover?category=${category.id}`)}
                className="tap-feedback rounded-2xl border bg-card p-3 text-left"
              >
                <div className="mb-1.5 text-xl">{category.icon}</div>
                <p className="text-sm font-semibold text-card-foreground">{category.name}</p>
                {category.urgent && <Badge variant="destructive" className="mt-2 rounded-full px-2 py-0 text-[10px]">Urgent</Badge>}
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Why people trust NearKonnect</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { icon: Compass, title: "Nearby first", text: "Get matched with helpers around your area quickly." },
              { icon: ShieldCheck, title: "Trust signals", text: "Profiles, ratings and verified workers for confidence." },
              { icon: HeartPulse, title: "Urgent support", text: "Emergency and blood requests stand out instantly." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border bg-card p-4">
                <item.icon className="mb-2 h-5 w-5 text-primary" />
                <p className="font-semibold text-card-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Nearby Workers</h2>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/discover")}>View all <ArrowRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {nearbyWorkers.map((worker, index) => (
              <WorkerCard key={`nearby-${worker.id}-${index}`} worker={worker} index={index} />
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={4} className="rounded-3xl border bg-card p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="mb-2 text-2xl font-bold text-foreground">Join your local help community</h2>
              <p className="mb-4 text-sm text-muted-foreground">Sign up to request fast service, respond to urgent needs, and build trust through real local connections.</p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate("/register")}>Get Started</Button>
                <Button variant="outline" onClick={() => navigate("/register?role=worker")}>Join as Service</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Active clients", value: "1.2k+", icon: Users },
                { label: "Urgent requests", value: "Live", icon: HeartPulse },
                { label: "Instant chat", value: "Enabled", icon: MessageSquare },
                { label: "Categories", value: String(serviceCategories.length), icon: Compass },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-muted/50 p-4">
                  <stat.icon className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
