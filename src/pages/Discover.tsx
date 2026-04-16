import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Map, List, MapPin, Navigation, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MonetizedWorkerGrid from "@/components/MonetizedWorkerGrid";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateDistance } from "@/lib/geolocation";
import AppLayout from "@/components/AppLayout";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import { MAIN_SERVICE_CATEGORIES, SUBCATEGORIES_BY_MAIN } from "@/data/serviceCategories";

type SortKey = "distance" | "rating" | "experience" | "price";
const MAX_RADIUS_KM = 20;

const Discover = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("distance");
  const [priceBand, setPriceBand] = useState<"all" | "budget" | "mid" | "premium">("all");
  const [minRating, setMinRating] = useState(0);
  const selectedMainCategory = searchParams.get("main_category") || "";
  const selectedSubCategory = searchParams.get("sub_category") || "";
  const [expandedMainCategory, setExpandedMainCategory] = useState(selectedMainCategory);
  const [showMapView, setShowMapView] = useState(false);
  const { coords: userCoords, status: locationStatus, refresh: refreshLocation } = useRealtimeLocation();

  const { data: monetization } = useQuery({
    queryKey: ["discover_monetization"],
    queryFn: async () => {
      const [featuredRes, boostsRes, adsRes, settingRes] = await Promise.all([
        (supabase as any).from("featured_services").select("service_id, rotation_seed").eq("is_active", true),
        (supabase as any).from("service_boosts").select("service_id").eq("status", "active"),
        (supabase as any)
          .from("native_ads")
          .select("id,title,description,image_url,cta_label,cta_url,placement,priority")
          .eq("is_active", true),
        (supabase as any).from("ad_placement_settings").select("frequency_min").eq("placement_key", "discover_feed").maybeSingle(),
      ]);
      return {
        featured: featuredRes.data || [],
        boosts: boostsRes.data || [],
        ads: adsRes.data || [],
        frequency: settingRes.data?.frequency_min || 5,
      };
    },
  });

  const { data: dbWorkers = [] } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*, profiles(full_name, phone, avatar_url)")
        .eq("available", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: true,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    const channelName = `workers-rt-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);
    channel.on("postgres_changes", { event: "*", schema: "public", table: "workers" }, () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    });
    channel.on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    });
    channel.on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => {
      queryClient.invalidateQueries({ queryKey: ["review_stats"] });
    });
    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: reviewStats } = useQuery({
    queryKey: ["review_stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("worker_id, rating");
      if (error) {
        console.warn("Review stats unavailable", error.message);
        return {} as Record<string, { total: number; count: number }>;
      }
      const stats: Record<string, { total: number; count: number }> = {};
      data.forEach((r: any) => {
        if (!stats[r.worker_id]) stats[r.worker_id] = { total: 0, count: 0 };
        stats[r.worker_id].total += r.rating;
        stats[r.worker_id].count += 1;
      });
      return stats;
    },
    enabled: true,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  const workersList = useMemo(() => {
    return dbWorkers.map((w: any) => {
      const stats = reviewStats?.[w.id];
      const rating = stats ? parseFloat((stats.total / stats.count).toFixed(1)) : 0;
      let distance = 0;
      if (userCoords && w.latitude && w.longitude) {
        distance = parseFloat(calculateDistance(userCoords.latitude, userCoords.longitude, w.latitude, w.longitude).toFixed(1));
      }
      return {
        id: w.id,
        userId: w.user_id,
        name: w.profiles?.full_name || "Unknown",
        profession: w.profession,
        rating,
        reviewCount: stats?.count || 0,
        experience: w.experience,
        distance,
        available: w.available,
        verified: w.verified,
        phone: w.profiles?.phone || "",
        description: w.description || "",
        serviceAreas: w.service_areas || [],
        profilePhoto: w.profiles?.avatar_url || "",
        city: w.city || "",
        mainCategory: w.main_category || "",
        subCategory: w.sub_category || "",
      };
    });
  }, [dbWorkers, userCoords, reviewStats]);

  const ownWorkerUserId = user?.id || null;

  useEffect(() => {
    if (selectedMainCategory) {
      setExpandedMainCategory(selectedMainCategory);
    }
  }, [selectedMainCategory]);

  const filtered = useMemo(() => {
    let list = [...workersList];
    // Exclude the current user's own worker profile from the list
    if (ownWorkerUserId) {
      list = list.filter((w) => w.userId !== ownWorkerUserId);
    }
    if (selectedMainCategory) {
      list = list.filter(w => w.mainCategory === selectedMainCategory);
    }
    if (selectedSubCategory) {
      list = list.filter(w => w.subCategory === selectedSubCategory);
    }
    if (search) {
      const words = search.toLowerCase().trim().split(/\s+/);
      list = list.filter(w => {
        const name = w.name.toLowerCase();
        const prof = w.profession.toLowerCase();
        const mainCategory = w.mainCategory.toLowerCase();
        const subCategory = w.subCategory.toLowerCase();
        return words.every(
          word => name.includes(word) || prof.includes(word) || mainCategory.includes(word) || subCategory.includes(word)
        );
      });
    }
    if (userCoords) {
      list = list
        .filter((w) => w.distance > 0 && w.distance <= MAX_RADIUS_KM)
        .sort((a, b) => a.distance - b.distance);
    }
    list.sort((a, b) => {
      if (sort === "distance") return a.distance - b.distance;
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price") return a.experience - b.experience;
      return b.experience - a.experience;
    });
    return list;
  }, [workersList, selectedMainCategory, selectedSubCategory, search, sort, ownWorkerUserId, userCoords]);

  const sponsoredServiceIds = useMemo(() => {
    const ids = new Set<string>();
    (monetization?.featured || []).forEach((row: any) => ids.add(row.service_id));
    (monetization?.boosts || []).forEach((row: any) => ids.add(row.service_id));
    return ids;
  }, [monetization]);

  const toggleMainCategory = (mainCategory: string) => {
    const next = new URLSearchParams(searchParams);
    if (selectedMainCategory === mainCategory) {
      next.delete("main_category");
      next.delete("sub_category");
      setExpandedMainCategory("");
    } else {
      next.set("main_category", mainCategory);
      next.delete("sub_category");
      setExpandedMainCategory(mainCategory);
    }
    setSearchParams(next);
  };

  const toggleSubCategory = (subCategory: string) => {
    const next = new URLSearchParams(searchParams);
    if (selectedSubCategory === subCategory) {
      next.delete("sub_category");
    } else {
      next.set("sub_category", subCategory);
    }
    setSearchParams(next);
  };

  const sortLabels: Record<SortKey, string> = {
    distance: "Distance",
    rating: "Rating",
    experience: "Experience",
    price: "Price",
  };

  const filteredWithAdvanced = filtered.filter((w) => {
    if (minRating > 0 && w.rating < minRating) return false;
    if (priceBand === "budget") return w.experience <= 2;
    if (priceBand === "mid") return w.experience > 2 && w.experience <= 6;
    if (priceBand === "premium") return w.experience > 6;
    return true;
  });

  const sorted = [...filteredWithAdvanced].sort((a, b) => {
    const aSponsored = sponsoredServiceIds.has(a.id) ? 1 : 0;
    const bSponsored = sponsoredServiceIds.has(b.id) ? 1 : 0;
    if (aSponsored !== bSponsored) return bSponsored - aSponsored;
    if (sort === "distance") return a.distance - b.distance;
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "experience") return b.experience - a.experience;
    return a.experience - b.experience;
  });

  const discoverAds = useMemo(() => {
    const placement = selectedMainCategory || selectedSubCategory ? "category_feed" : "discover_feed";
    return (monetization?.ads || []).filter((a: any) => a.placement === placement || a.placement === "search_results");
  }, [monetization, selectedMainCategory, selectedSubCategory]);

  return (
    <AppLayout title="Explore" subtitle="Discover trusted services nearby with smart filters and map/list browsing.">
      <div className="space-y-5">
        <div className="rounded-2xl border bg-muted/40 p-3">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {locationStatus === "denied" ? (
              <span>Please enable location to continue</span>
            ) : userCoords ? (
              <span>Using your current location ({userCoords.latitude.toFixed(2)}, {userCoords.longitude.toFixed(2)})</span>
            ) : (
              <span>Detecting current location...</span>
            )}
            <Button variant="ghost" size="sm" onClick={refreshLocation} className="h-6 gap-1 px-2 text-[11px]">
              <Navigation className="h-3 w-3" /> Update my location
            </Button>
          </div>

          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Find services near you..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-xl bg-card pl-10" />
            </div>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => setShowMapView((v) => !v)}>
              {showMapView ? <List className="h-4 w-4" /> : <Map className="h-4 w-4" />}
            </Button>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {(["distance", "rating", "experience", "price"] as SortKey[]).map((s) => (
              <Button key={s} variant={sort === s ? "default" : "outline"} size="sm" onClick={() => setSort(s)} className="shrink-0 rounded-full">
                {sortLabels[s]}
              </Button>
            ))}
            <Button variant="outline" size="sm" className="shrink-0 gap-1 rounded-full">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border bg-muted/30 p-3">
          <p className="text-sm font-semibold text-foreground">Browse by category</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MAIN_SERVICE_CATEGORIES.map((mainCategory) => {
              const isSelected = selectedMainCategory === mainCategory;
              const isExpanded = expandedMainCategory === mainCategory;
              return (
                <button
                  key={mainCategory}
                  type="button"
                  onClick={() => toggleMainCategory(mainCategory)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all ${
                    isSelected ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{mainCategory}</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              );
            })}
          </div>

          {expandedMainCategory && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {SUBCATEGORIES_BY_MAIN[expandedMainCategory as keyof typeof SUBCATEGORIES_BY_MAIN].map((subCategory) => (
                <Badge
                  key={subCategory}
                  variant={selectedSubCategory === subCategory ? "default" : "outline"}
                  className="cursor-pointer shrink-0 rounded-full px-3 py-1.5"
                  onClick={() => toggleSubCategory(subCategory)}
                >
                  {subCategory}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {([0, 3, 4, 4.5] as const).map((rating) => (
            <Button
              key={rating}
              size="sm"
              variant={minRating === rating ? "default" : "outline"}
              onClick={() => setMinRating(rating)}
              className="shrink-0 rounded-full"
            >
              {rating === 0 ? "All ratings" : `${rating}+ stars`}
            </Button>
          ))}
          {(["all", "budget", "mid", "premium"] as const).map((band) => (
            <Button
              key={band}
              size="sm"
              variant={priceBand === band ? "default" : "outline"}
              onClick={() => setPriceBand(band)}
              className="shrink-0 rounded-full"
            >
              {band}
            </Button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">{sorted.length} services found</p>
        {showMapView ? (
          <div className="rounded-2xl border bg-card p-12 text-center">
            <Map className="mx-auto mb-2 h-9 w-9 text-primary" />
            <p className="font-semibold text-card-foreground">Map view</p>
            <p className="text-sm text-muted-foreground">Nearby workers (simulated pins within {MAX_RADIUS_KM} km)</p>
            <div className="mx-auto mt-4 max-w-md space-y-2 text-left">
              {sorted.slice(0, 6).map((worker) => (
                <div key={`map-pin-${worker.id}`} className="flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-2 text-xs">
                  <span className="font-medium text-foreground">📍 {worker.name}</span>
                  <span className="text-muted-foreground">{worker.distance.toFixed(1)} km away</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <MonetizedWorkerGrid
            workers={sorted.map((w) => ({ ...w, isSponsored: sponsoredServiceIds.has(w.id) }))}
            ads={discoverAds}
            adFrequencyMin={Math.max(4, monetization?.frequency || 5)}
          />
        )}

        {sorted.length === 0 && (
          <div className="rounded-2xl border bg-muted/30 p-10 text-center">
            <p className="font-semibold text-foreground">No services match this filter set</p>
            <p className="text-sm text-muted-foreground">Try widening distance, rating, or category filters.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Discover;