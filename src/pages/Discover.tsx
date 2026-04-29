import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Map, List, MapPin, Navigation, SlidersHorizontal, X, Home as HomeIcon, Car, ShoppingBag, Briefcase, HeartPulse, Sparkles, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import WorkerCard from "@/components/WorkerCard";
import WorkersMap from "@/components/WorkersMap";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateDistance } from "@/lib/geolocation";
import AppLayout from "@/components/AppLayout";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import { useFeaturedWorkerIds } from "@/hooks/useSponsored";
import { useCategories } from "@/hooks/useCategories";
import { useAdminUserIds } from "@/hooks/useAdminUserIds";

type SortKey = "distance" | "rating" | "experience" | "price";
type RadiusKm = 1 | 2 | 3 | 5 | 10 | 20 | null;
const MAX_RADIUS_KM = 20;

import { useWorkers } from "@/hooks/useWorkers";

const Discover = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [sort, setSort] = useState<SortKey>("distance");
  const [priceBand, setPriceBand] = useState<"all" | "budget" | "mid" | "premium">("all");
  const [minRating, setMinRating] = useState(0);
  const selectedMainCategory = searchParams.get("main_category") || "";
  const selectedSubCategory = searchParams.get("sub_category") || "";
  const [expandedMainCategory, setExpandedMainCategory] = useState(selectedMainCategory);
  const CATEGORIES_INITIAL = 6;
  const CATEGORIES_STEP = 6;
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(CATEGORIES_INITIAL);

  // Sync search input when URL param changes (e.g. arriving from Home with ?search=...)
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    setSearch(urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("search")]);

  // Reflect typed search into the URL (debounced) so it's shareable and consistent
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      const current = next.get("search") || "";
      if (search.trim()) {
        if (current !== search) {
          next.set("search", search);
          setSearchParams(next, { replace: true });
        }
      } else if (current) {
        next.delete("search");
        setSearchParams(next, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const [showMapView, setShowMapView] = useState(false);
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(10 as any);
  const { coords: userCoords, status: locationStatus, refresh: refreshLocation } = useRealtimeLocation();
  const { data: allWorkers = [], isLoading: workersLoading } = useWorkers();
  const featuredIds = useFeaturedWorkerIds();
  const adminUserIds = useAdminUserIds();

  const { data: nearbyIds } = useQuery({
    queryKey: ["nearby_workers", radiusKm, userCoords?.latitude, userCoords?.longitude],
    queryFn: async () => {
      if (!userCoords || !radiusKm) return null;
      const { data, error } = await (supabase.rpc as any)("get_nearby_workers", {
        lat: userCoords.latitude,
        lng: userCoords.longitude,
        radius_meters: radiusKm * 1000,
        max_results: 100,
      });
      if (error) throw error;
      const result: Record<string, number> = {};
      (data || []).forEach((r: any) => { result[r.id] = Number(r.distance) || 0; });
      return result;
    },
    enabled: !!userCoords && !!radiusKm,
    staleTime: 30_000,
  });

  const { categories, mainCategories, getSubCategories } = useCategories();

  const categoriesToUse = useMemo(() => {
    return mainCategories.map(c => c.name);
  }, [mainCategories]);

  const subCategoriesToUse = useMemo(() => {
    if (!expandedMainCategory) return [];
    return getSubCategories(expandedMainCategory).map(c => c.name);
  }, [expandedMainCategory, getSubCategories]);

  const workersList = useMemo(() => {
    return allWorkers.map((w) => {
      let distance = w.distance;
      if (userCoords && w.latitude && w.longitude) {
        distance = parseFloat(calculateDistance(userCoords.latitude, userCoords.longitude, w.latitude, w.longitude).toFixed(1));
      }
      return { ...w, distance };
    });
  }, [allWorkers, userCoords]);

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
    // Admins are never treated as workers — hide them from the explore list
    if (adminUserIds.size > 0) {
      list = list.filter((w) => !adminUserIds.has(w.userId));
    }
    if (selectedMainCategory && selectedSubCategory) {
      // If both are selected, we want strict matching for both (hierarchical)
      list = list.filter(w => w.mainCategory === selectedMainCategory && w.subCategory === selectedSubCategory);
    } else if (selectedMainCategory) {
      // If only main category is selected, show workers matching it in EITHER field
      list = list.filter(w => w.mainCategory === selectedMainCategory || w.subCategory === selectedMainCategory);
    } else if (selectedSubCategory) {
      // If only sub category is selected, show workers matching it in EITHER field
      list = list.filter(w => w.subCategory === selectedSubCategory || w.mainCategory === selectedSubCategory);
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
      // Keep all workers; just sort known-distance ones first
      list.sort((a, b) => {
        const aHas = a.distance > 0 ? 1 : 0;
        const bHas = b.distance > 0 ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return a.distance - b.distance;
      });
    }
    if (radiusKm && nearbyIds) {
      list = list
        .filter((w) => nearbyIds[w.id] !== undefined)
        .map((w) => ({ ...w, matchedDistanceMeters: nearbyIds[w.id] }));
    } else if (radiusKm && userCoords) {
      // Fallback manual filtering if RPC fails or is still loading
      list = list.filter((w) => w.distance <= (radiusKm as number));
    }
    list.sort((a, b) => {
      if (sort === "distance") return a.distance - b.distance;
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price") return a.experience - b.experience;
      return b.experience - a.experience;
    });
    return list;
  }, [workersList, selectedMainCategory, selectedSubCategory, search, sort, ownWorkerUserId, userCoords, radiusKm, nearbyIds, adminUserIds]);



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
    const aF = featuredIds.has(a.id) ? 1 : 0;
    const bF = featuredIds.has(b.id) ? 1 : 0;
    if (aF !== bF) return bF - aF;
    if (sort === "distance") return a.distance - b.distance;
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "experience") return b.experience - a.experience;
    return a.experience - b.experience;
  });

  return (
    <AppLayout title="Explore" subtitle="Discover trusted services nearby with smart filters and map/list browsing.">
      <div className="space-y-5">
        <div className="rounded-3xl bg-card p-4 shadow-premium md:-mt-12">
          <div className="mb-3 flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {locationStatus === "denied" ? (
              <span>Please enable location to continue</span>
            ) : userCoords ? (
              <span className="truncate">Using current location ({userCoords.latitude.toFixed(2)}, {userCoords.longitude.toFixed(2)})</span>
            ) : (
              <span>Detecting current location...</span>
            )}
            <Button variant="ghost" size="sm" onClick={refreshLocation} className="ml-auto h-6 gap-1 px-2 text-[11px]">
              <Navigation className="h-3 w-3" /> Update
            </Button>
          </div>

          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Find services near you..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 rounded-full border-none bg-muted pl-11" />
            </div>
            <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => setShowMapView((v) => !v)}>
              {showMapView ? <List className="h-4 w-4" /> : <Map className="h-4 w-4" />}
            </Button>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {(["distance", "rating", "experience"] as SortKey[]).map((s) => (
              <Button key={s} variant={sort === s ? "default" : "outline"} size="sm" onClick={() => setSort(s)} className="shrink-0">
                {sortLabels[s]}
              </Button>
            ))}
            <div className="mx-1 h-8 w-px bg-white/10" />
            {([1, 2, 5, 10, 20] as number[]).map((r) => (
              <Button
                key={r}
                variant={radiusKm === r ? "default" : "outline"}
                size="sm"
                onClick={() => setRadiusKm(r as any)}
                className="shrink-0"
              >
                {r}km
              </Button>
            ))}
            <Button
              variant={radiusKm === null ? "default" : "outline"}
              size="sm"
              onClick={() => setRadiusKm(null)}
              className="shrink-0"
            >
              Any distance
            </Button>
          </div>
        </div>

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
              {(selectedMainCategory || selectedSubCategory) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-hero-foreground hover:bg-white/10"
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete("main_category");
                    next.delete("sub_category");
                    setExpandedMainCategory("");
                    setSearchParams(next);
                  }}
                >
                  <X className="h-3 w-3" /> Clear
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {categoriesToUse.map((mainCategory) => {
                const isSelected = selectedMainCategory === mainCategory;
                
                // Try to find matching icon or emoji
                const dbCat = categories.find(c => c.name === mainCategory);
                const emoji = dbCat?.icon;
                
                const Icon = ({
                  "Home & Local Services": HomeIcon,
                  "Automotive & Transport": Car,
                  "Shops, Food & Daily Needs": ShoppingBag,
                  "Professional & Business Services": Briefcase,
                  "Health, Education & Community": HeartPulse,
                  "Events & Lifestyle": Sparkles,
                } as any)[mainCategory] || Compass;

                return (
                  <button
                    key={mainCategory}
                    type="button"
                    onClick={() => toggleMainCategory(mainCategory)}
                    className={`tap-feedback group flex flex-col items-start gap-2.5 rounded-2xl p-3 text-left transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-white/5 text-hero-foreground ring-1 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
                        isSelected ? "bg-primary-foreground/15 text-primary-foreground" : "bg-white/10 text-primary group-hover:bg-white/15"
                      }`}
                    >
                      {emoji ? (
                        <span className="text-base">{emoji}</span>
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                    <span className="text-xs font-semibold leading-tight">{mainCategory}</span>
                  </button>
                );
              })}
            </div>

            {expandedMainCategory && (
              <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-hero-muted">
                  {expandedMainCategory}
                </p>
                <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
                  {subCategoriesToUse.map((subCategory) => {
                    const active = selectedSubCategory === subCategory;
                    return (
                      <button
                        key={subCategory}
                        type="button"
                        onClick={() => toggleSubCategory(subCategory)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors text-inherit bg-inherit ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/10 text-hero-foreground hover:bg-white/15"
                        }`}
                      >
                        {subCategory}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Radius:</span>
          {([1, 2, 3] as const).map((km) => (
            <Button
              key={km}
              size="sm"
              variant={radiusKm === km ? "default" : "outline"}
              onClick={() => setRadiusKm(radiusKm === km ? null : km)}
              disabled={!userCoords}
              className="shrink-0 rounded-full"
            >
              {km} km
            </Button>
          ))}
          {radiusKm && (
            <Button size="sm" variant="ghost" onClick={() => setRadiusKm(null)} className="shrink-0 rounded-full text-xs">
              Clear
            </Button>
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
        </div>

        <p className="text-sm text-muted-foreground">{sorted.length} services found</p>
        {showMapView ? (
          <WorkersMap
            workers={sorted
              .filter((w) => (allWorkers.find((d: any) => d.id === w.id)?.latitude) && (allWorkers.find((d: any) => d.id === w.id)?.longitude))
              .map((w) => {
                const db: any = allWorkers.find((d: any) => d.id === w.id);
                return {
                  id: w.id,
                  name: w.name,
                  profession: w.profession,
                  latitude: db.latitude,
                  longitude: db.longitude,
                  distanceKm: w.distance > 0 ? w.distance : undefined,
                };
              })}
            userCoords={userCoords}
            height="500px"
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((w, i) => (
              <WorkerCard key={`worker-${w.id}-${i}`} worker={w} index={i} sponsored={featuredIds.has(w.id)} />
            ))}
          </div>
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