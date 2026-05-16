import { useState, useMemo, useEffect } from "react";
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

  const [radiusKm, setRadiusKm] = useState<RadiusKm>(10 as any);
  const { coords: userCoords, status: locationStatus, refresh: refreshLocation } = useRealtimeLocation();
  const { data: allWorkers = [], isLoading: workersLoading } = useWorkers();
  const featuredIds = useFeaturedWorkerIds();
  const adminUserIds = useAdminUserIds();
  const bannerAds = useNativeAds("home_banner", userCoords);

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

  const ownWorkerUserId = user?.id || null;

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
    if (radiusKm && nearbyIds) {
      list = list
        .filter((w) => nearbyIds[w.id] !== undefined)
        .map((w) => ({ ...w, matchedDistanceMeters: nearbyIds[w.id] }));
    } else if (radiusKm && userCoords) {
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
    () => sorted.filter((w) => featuredIds.has(w.id)).slice(0, 6),
    [sorted, featuredIds]
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



  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);

  return (
    <AppLayout hideMobileHeader>
      <div className="-mx-4 -mt-[90px] -mb-[166px] bg-hero text-hero-foreground">
        {/* TOP APP BAR */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-hero/80 px-5 py-3 backdrop-blur-md">
          <Link to="/" className="inline-flex items-center gap-2">
            <Menu className="h-5 w-5 text-hero-foreground" />
            <span className="text-base font-bold tracking-tight">Near Konnect</span>
          </Link>
          <NotificationBell />
        </header>

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

        {/* FEATURED PROFESSIONALS */}
        {featuredWorkers.length > 0 && (
          <section className="mt-6 px-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Star className="h-4 w-4 fill-primary text-primary" /> Featured Professionals
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Premium</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {featuredWorkers.map((w, i) => (
                <ExploreCard key={`feat-${w.id}-${i}`} worker={w as any} premium isAuthed={!!user} />
              ))}
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {allOthers.map((w, i) => (
                <ExploreCard key={`worker-${w.id}-${i}`} worker={w as any} isAuthed={!!user} />
              ))}
            </div>
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

interface ExploreCardProps {
  worker: Worker & { distance: number };
  premium?: boolean;
  isAuthed: boolean;
}

const ExploreCard = ({ worker, premium = false, isAuthed }: ExploreCardProps) => {
  const navigate = useNavigate();
  const initials = worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const distLabel = worker.distance > 0 && isFinite(worker.distance) ? `${worker.distance} km away` : "Distance unknown";

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border p-4 transition-all ${
        premium
          ? "border-primary/20 bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-[0_0_24px_-12px_hsl(var(--primary)/0.5)] hover:border-primary/40"
          : "border-white/10 bg-white/[0.04] hover:border-white/20"
      }`}
    >
      {premium && (
        <div className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-bl-lg bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-md">
          <Award className="h-3 w-3" /> Premium
        </div>
      )}

        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0 group">
              <Avatar className="h-16 w-16 rounded-lg border border-white/10 [&_img]:grayscale [&_img]:transition-all [&_img]:duration-500 group-hover:[&_img]:grayscale-0">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className="rounded-lg bg-white/10 text-sm font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-hero ${
                  worker.available ? "bg-primary" : "bg-white/30"
                }`}
              />
            </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="truncate text-sm font-bold text-hero-foreground">{worker.name}</h3>
              {worker.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </div>
            <p className="truncate text-xs text-primary/80">{worker.profession}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="inline-flex items-center gap-1 text-primary">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="text-sm font-bold">{worker.rating?.toFixed(1) || "—"}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-hero-muted">{distLabel}</p>
        </div>
      </div>

      {(worker.mainCategory || worker.subCategory) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-hero-muted">
          {worker.mainCategory && <span className="text-hero-foreground">{worker.mainCategory}</span>}
          {worker.mainCategory && worker.subCategory && <span className="opacity-40">•</span>}
          {worker.subCategory && <span>{worker.subCategory}</span>}
          {worker.experience > 0 && (
            <>
              <span className="opacity-40">•</span>
              <span className="text-primary/80">{worker.experience}+ yrs</span>
            </>
          )}
        </div>
      )}

      <div className="mt-auto flex gap-2 border-t border-white/5 pt-3">
        <Button
          variant="ghost"
          className="flex-1 rounded-lg bg-white/5 text-xs font-semibold text-hero-foreground hover:bg-white/10"
          onClick={() => navigate(`/worker/${worker.id}`)}
        >
          View Profile
        </Button>
        {isAuthed ? (
          <Button
            className="flex-1 rounded-lg text-xs font-semibold"
            onClick={() => navigate(`/worker/${worker.id}`)}
          >
            Contact
          </Button>
        ) : (
          <AuthRequiredDialog title="Log in to contact" description="Sign in or create an account to contact this provider.">
            <Button className="flex-1 rounded-lg text-xs font-semibold">Contact</Button>
          </AuthRequiredDialog>
        )}
      </div>
    </article>
  );
};

export default Discover;
