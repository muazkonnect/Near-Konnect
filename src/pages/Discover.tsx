import { useState, useMemo, useEffect, useRef } from "react";
import WorkerProfilePopup from "@/components/WorkerProfilePopup";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  Navigation,
  X,
  Home as HomeIcon,
  Car,
  ShoppingBag,
  Briefcase,
  HeartPulse,
  Sparkles,
  Compass,
  Star,
  ArrowRight,
  Zap,
  ShieldCheck,
  Clock3,
  BadgeCheck,
  Award,
  Menu,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";
import type { Worker } from "@/data/mockData";

import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateDistance } from "@/lib/geolocation";
import AppLayout from "@/components/AppLayout";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import { useFeaturedWorkerIds, useNativeAds } from "@/hooks/useSponsored";
import NativeAdCard from "@/components/NativeAdCard";
import { useCategories } from "@/hooks/useCategories";
import { useAdminUserIds } from "@/hooks/useAdminUserIds";
import { useWorkers } from "@/hooks/useWorkers";
import logoImg from "@/assets/logo.svg";
import NotificationBell from "@/components/NotificationBell";
import ExploreCard from "@/components/ExploreCard";
import FeaturedWorkerCard from "@/components/featured/FeaturedWorkerCard";
import WorkerAdCard from "@/components/WorkerAdCard";
import { usePromotedExploreInfinite, usePromotedNearby } from "@/hooks/usePromoted";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useNearbyFeaturedWorkerIds } from "@/hooks/useFeatured";
import SteppedCarousel from "@/components/SteppedCarousel";

type SortKey = "distance" | "rating" | "experience" | "price";
type RadiusKm = 1 | 2 | 3 | 5 | 10 | 20 | null;

const Discover = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [sort, setSort] = useState<SortKey>("distance");
  const [priceBand] = useState<"all" | "budget" | "mid" | "premium">("all");
  const [minRating, setMinRating] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const selectedMainCategory = searchParams.get("main_category") || "";
  const selectedSubCategory = searchParams.get("sub_category") || "";
  const [expandedMainCategory, setExpandedMainCategory] = useState(selectedMainCategory);
  const CATEGORIES_INITIAL = 6;
  const CATEGORIES_STEP = 6;
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(CATEGORIES_INITIAL);

  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    setSearch(urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("search")]);

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

  const { data: appSettings } = useAppSettings();
  const discoverDefault = (appSettings?.discover_default_radius_km ?? 3) as RadiusKm;
  const exploreDefault = appSettings?.explore_default_radius_km ?? 10;
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(discoverDefault);
  useEffect(() => { setRadiusKm(discoverDefault); }, [discoverDefault]);
  const { coords: userCoords, status: locationStatus, refresh: refreshLocation } = useRealtimeLocation();
  const { data: allWorkers = [], isLoading: workersLoading } = useWorkers();
  const ownWorkerUserId = user?.id || null;
  const ownWorkerCoords = useMemo(() => {
    const ownWorker = allWorkers.find(
      (w) => w.userId === ownWorkerUserId && w.latitude != null && w.longitude != null
    );
    return ownWorker ? { latitude: ownWorker.latitude!, longitude: ownWorker.longitude! } : null;
  }, [allWorkers, ownWorkerUserId]);
  const featuredLookupCoords = userCoords ?? ownWorkerCoords;
  const adminFeaturedIds = useFeaturedWorkerIds();
  const paidFeaturedIds = useNearbyFeaturedWorkerIds(featuredLookupCoords);
  const featuredIds = useMemo(
    () => new Set<string>([...adminFeaturedIds, ...paidFeaturedIds]),
    [adminFeaturedIds, paidFeaturedIds]
  );
  const adminUserIds = useAdminUserIds();
  const bannerAds = useNativeAds("home_banner", userCoords);

  const { items: exploreAds, fetchNextPage, hasNextPage, isFetchingNextPage } = usePromotedExploreInfinite(userCoords, {
    mainCategory: selectedMainCategory,
    search,
    radiusKm: selectedMainCategory ? radiusKm : undefined,
    defaultRadiusKm: exploreDefault,
  });
  const promoted3km = usePromotedNearby(userCoords, (discoverDefault as number) || 3);
  const promoted3kmFiltered = useMemo(() => {
    let list = promoted3km;
    if (selectedMainCategory && selectedSubCategory) {
      list = list.filter((w: any) => w.mainCategory === selectedMainCategory && w.subCategory === selectedSubCategory);
    } else if (selectedMainCategory) {
      list = list.filter((w: any) => w.mainCategory === selectedMainCategory || w.subCategory === selectedMainCategory);
    } else if (selectedSubCategory) {
      list = list.filter((w: any) => w.subCategory === selectedSubCategory || w.mainCategory === selectedSubCategory);
    }
    if (search.trim()) {
      const words = search.toLowerCase().trim().split(/\s+/);
      list = list.filter((w: any) => {
        const hay = `${w.name} ${w.profession} ${w.mainCategory} ${w.subCategory}`.toLowerCase();
        return words.every((wd) => hay.includes(wd));
      });
    }
    return list;
  }, [promoted3km, selectedMainCategory, selectedSubCategory, search]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      }
    }, { rootMargin: "400px 0px" });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
  const categoriesToUse = useMemo(() => mainCategories.map(c => c.name), [mainCategories]);
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

  useEffect(() => {
    if (selectedMainCategory) setExpandedMainCategory(selectedMainCategory);
  }, [selectedMainCategory]);

  const filtered = useMemo(() => {
    let list = [...workersList];
    if (ownWorkerUserId) list = list.filter((w) => w.userId !== ownWorkerUserId);
    if (adminUserIds.size > 0) list = list.filter((w) => !adminUserIds.has(w.userId));
    if (selectedMainCategory && selectedSubCategory) {
      list = list.filter(w => w.mainCategory === selectedMainCategory && w.subCategory === selectedSubCategory);
    } else if (selectedMainCategory) {
      list = list.filter(w => w.mainCategory === selectedMainCategory || w.subCategory === selectedMainCategory);
    } else if (selectedSubCategory) {
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
      list.sort((a, b) => {
        const aHas = a.distance > 0 ? 1 : 0;
        const bHas = b.distance > 0 ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return a.distance - b.distance;
      });
    }
    if (radiusKm && userCoords) {
      list = list.filter((w) => {
        if (w.latitude == null || w.longitude == null) return false;
        const meters = calculateDistance(userCoords.latitude, userCoords.longitude, w.latitude, w.longitude) * 1000;
        return meters <= (radiusKm as number) * 1000;
      }).map((w) => {
        const meters = calculateDistance(userCoords.latitude, userCoords.longitude, w.latitude!, w.longitude!) * 1000;
        return { ...w, matchedDistanceMeters: meters };
      });
    }
    list.sort((a, b) => {
      if (sort === "distance") return a.distance - b.distance;
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price") return a.experience - b.experience;
      return b.experience - a.experience;
    });
    return list;
  }, [workersList, selectedMainCategory, selectedSubCategory, search, sort, ownWorkerUserId, userCoords, radiusKm, nearbyIds, adminUserIds]);

  const filteredWithAdvanced = filtered.filter((w) => {
    if (minRating > 0 && w.rating < minRating) return false;
    if (verifiedOnly && !w.verified) return false;
    if (availableOnly && !w.available) return false;
    if (priceBand === "budget") return w.experience <= 2;
    if (priceBand === "mid") return w.experience > 2 && w.experience <= 6;
    if (priceBand === "premium") return w.experience > 6;
    return true;
  });

  const sorted = useMemo(() => [...filteredWithAdvanced].sort((a, b) => {
    const aF = featuredIds.has(a.id) ? 1 : 0;
    const bF = featuredIds.has(b.id) ? 1 : 0;
    if (aF !== bF) return bF - aF;
    if (sort === "distance") return a.distance - b.distance;
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "experience") return b.experience - a.experience;
    return a.experience - b.experience;
  }), [filteredWithAdvanced, featuredIds, sort]);

  const featuredWorkers = useMemo(
    () =>
      workersList
        .filter(
          (w) =>
            featuredIds.has(w.id) &&
            !adminUserIds.has(w.userId)
        )
        .slice(0, 6),
    [workersList, featuredIds, adminUserIds]
  );
  const allOthers = useMemo(
    () => sorted.filter((w) => !featuredIds.has(w.id)),
    [sorted, featuredIds]
  );

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
    if (selectedSubCategory === subCategory) next.delete("sub_category");
    else next.set("sub_category", subCategory);
    setSearchParams(next);
  };






  return (
    <AppLayout title="Explore" subtitle="Find verified providers near you.">
      <div className="-mx-4 -mt-[90px] -mb-[166px] min-h-screen bg-hero text-hero-foreground">



        {/* SEARCH + FILTER CHIPS */}
        <section className="px-5 pt-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hero-muted" />
            <Input
              placeholder="Search for professional services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-white/5 pl-11 text-hero-foreground placeholder:text-hero-muted focus-visible:border-primary focus-visible:ring-0"
            />
          </div>

          <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {([
              { key: "nearby", label: "Nearby", Icon: Navigation, active: sort === "distance", onClick: () => setSort("distance") },
              { key: "verified", label: "Verified", Icon: BadgeCheck, active: verifiedOnly, onClick: () => setVerifiedOnly(v => !v) },
              { key: "available", label: "Available", Icon: Clock3, active: availableOnly, onClick: () => setAvailableOnly(v => !v) },
            ]).map(({ key, label, Icon, active, onClick }) => (
              <button
                key={key}
                onClick={onClick}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "border border-white/10 bg-white/5 text-hero-foreground hover:bg-white/10"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="-mx-1 mt-2 flex items-center gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-hero-muted">Radius</span>
            {([1, 2, 3, 5, 10, 20, null] as RadiusKm[]).map((r) => (
              <button
                key={String(r)}
                onClick={() => setRadiusKm(r)}
                className={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  radiusKm === r
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "border border-white/10 bg-white/5 text-hero-foreground hover:bg-white/10"
                }`}
              >
                {r === null ? "Any" : `${r} km`}
              </button>
            ))}
          </div>
        </section>

        {/* FEATURED ADS marquee */}
        {bannerAds.length > 0 && (
          <section className="mt-5">
            <div className="mb-2 px-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-hero-muted">
                Featured Ads (3km)
              </h3>
            </div>
            <div className="overflow-hidden">
              <div className="flex animate-[ads-slide_28s_linear_infinite] gap-4 px-5 pb-3">
                {[...bannerAds, ...bannerAds].map((ad, i) => (
                  <div key={`${ad.id}-${i}`} className="w-[300px] shrink-0">
                    <NativeAdCard ad={ad} variant="banner" viewerCoords={userCoords} />
                  </div>
                ))}
              </div>
              <style>{`@keyframes ads-slide { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
            </div>
          </section>
        )}

        {/* PROMOTED 3KM ADS */}
        <section className="mt-6 mb-2">
          <div className="mb-3 px-5">
            <h2 className="text-base font-bold">
              Promoted Nearby <span className="ml-2 text-xs font-normal text-hero-muted">• Within 3 KM</span>
            </h2>
          </div>
          {promoted3kmFiltered.length === 0 ? (
            <div className="mx-5 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-xs text-hero-muted">
              No promoted ads within 3 KM of your location
            </div>
          ) : (
            <SteppedCarousel
              className="pb-3"
              trackClassName="pl-5 pr-5"
              dwellMs={2800}
              items={promoted3kmFiltered.map((w) => (
                <div key={`explore-promo-${w.id}`}>
                  <WorkerAdCard
                    worker={w as any}
                    isAuthed={!!user}
                    campaignId={w.campaignId}
                    placement="explore_top"
                  />
                </div>
              ))}
            />
          )}
        </section>

        {/* FEATURED PROFESSIONALS — marquee, like ads section */}
        {featuredWorkers.length > 0 && (
          <section className="mt-2">
            <div className="mb-3 flex items-center justify-between px-5">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Featured Professionals
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400/20 to-amber-600/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 ring-1 ring-amber-400/30">
                <Award className="h-3 w-3" /> Premium
              </span>
            </div>
            <div className="group overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
              <div
                className="flex w-max gap-4 px-5 pb-3 animate-[featured-slide_45s_cubic-bezier(0.45,0,0.55,1)_infinite] will-change-transform hover:[animation-play-state:paused] group-hover:[animation-play-state:paused] group-active:[animation-play-state:paused] [-webkit-backface-visibility:hidden] [transform:translate3d(0,0,0)]"
              >
                {[...featuredWorkers, ...featuredWorkers].map((w, i) => (
                  <div key={`feat-${w.id}-${i}`} className="shrink-0">
                    <FeaturedWorkerCard
                      index={i}
                      worker={{
                        id: w.id,
                        uid: (w as any).uid,
                        full_name: w.name,
                        profession: w.profession,
                        experience: w.experience,
                        verified: w.verified,
                        avatar_url: w.profilePhoto || null,
                        city: w.city || null,
                        distance: w.distance,
                      }}
                    />
                  </div>
                ))}
              </div>
              <style>{`@keyframes featured-slide { 0% { transform: translate3d(0,0,0) } 100% { transform: translate3d(-50%,0,0) } }`}</style>
            </div>

          </section>
        )}


        {/* ALL PROFESSIONALS */}
        <section className="mt-6 px-5 pb-10">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-base font-bold">All Professionals</h2>
            <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-hero-muted">
              {sorted.length} found
            </span>
          </div>

          {workersLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              ))}
            </div>
          ) : allOthers.length === 0 && featuredWorkers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
              <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-primary" />
              <p className="font-semibold">No services match this filter set</p>
              <p className="mt-1 text-xs text-hero-muted">Try widening distance, rating, or category filters.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {allOthers.map((w, i) => {
                  const adIndex = Math.floor(i / 6);
                  const showAd = i > 0 && i % 6 === 0 && exploreAds[adIndex - 1];
                  const ad = showAd ? exploreAds[adIndex - 1] : null;
                  return (
                    <div key={`worker-${w.id}-${i}`} className="contents">
                      {ad && (
                        <div key={`ad-${ad.campaignId}`} className="flex justify-center">
                          <WorkerAdCard
                            worker={ad as any}
                            isAuthed={!!user}
                            campaignId={ad.campaignId}
                            placement="explore_feed"
                            premium
                          />
                        </div>
                      )}
                      <ExploreCard worker={w as any} isAuthed={!!user} />
                    </div>
                  );
                })}
              </div>
              <div ref={sentinelRef} className="h-10" />
              {isFetchingNextPage && (
                <div className="mt-4 text-center text-xs text-hero-muted">Loading more…</div>
              )}
            </>
          )}

          {!user && sorted.length > 0 && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <Clock3 className="h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs text-hero-muted">
                Browsing as guest. <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link> only when you want to contact a provider.
                <ArrowRight className="ml-1 inline h-3 w-3 text-primary" />
              </p>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};



export default Discover;
