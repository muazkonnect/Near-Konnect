import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Droplet,
  HeartPulse,
  MapPin,
  Search,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import logoImg from "@/assets/logo.svg";
import NotificationBell from "@/components/NotificationBell";
import CurrentLocationChip from "@/components/CurrentLocationChip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ExploreCard from "@/components/ExploreCard";
import WorkerAdCard from "@/components/WorkerAdCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { calculateDistance } from "@/lib/geolocation";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import { useFeaturedWorkerIds, useNativeAds } from "@/hooks/useSponsored";
import { useNearbyFeaturedWorkerIds } from "@/hooks/useFeatured";
import NativeAdCard from "@/components/NativeAdCard";
import SteppedCarousel from "@/components/SteppedCarousel";
import FeaturedWorkersCarousel from "@/components/FeaturedWorkersCarousel";
import BloodDonorPopup, { type BloodDonorPopupData } from "@/components/BloodDonorPopup";
import { useAdminUserIds } from "@/hooks/useAdminUserIds";
import { useWorkers } from "@/hooks/useWorkers";
import { usePromotedNearby, usePromotedTopRated } from "@/hooks/usePromoted";
import { useAppSetting } from "@/hooks/useAppSettings";

type DonorWithDistance = DonorRow & { distance: number };

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35 } }),
};

const QUICK_CHIPS = ["Carpenter", "Electrician", "Plumber", "Painter", "Gardener"];

type DonorRow = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  blood_group: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  contact_methods: unknown;
};

const toBloodDonorPopupData = (d: DonorWithDistance): BloodDonorPopupData => ({
  user_id: d.user_id,
  full_name: d.full_name,
  avatar_url: d.avatar_url,
  blood_group: d.blood_group,
  city: d.city,
  distance: isFinite(d.distance) ? d.distance : undefined,
  phone: d.phone ?? null,
  contact_methods: d.contact_methods,
});

const BloodDonorCarouselCard = ({ donor, onOpen }: { donor: DonorWithDistance; onOpen: (donor: DonorWithDistance) => void }) => {
  const initials = (donor.full_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2);
  const dist = isFinite(donor.distance) ? `${donor.distance.toFixed(1)} KM` : "Nearby";

  const open = () => onOpen(donor);

  return (
    <button
      type="button"
      onClick={open}
      onPointerDown={open}
      className="group relative flex min-w-[260px] cursor-pointer select-none flex-col gap-4 overflow-hidden rounded-2xl border border-destructive/20 bg-white p-5 text-left shadow-xl transition-all hover:-translate-y-0.5 hover:border-destructive/50 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
    >
      <div className="absolute -right-4 -top-4 grid h-16 w-16 place-items-center rounded-full bg-destructive/5 transition-transform group-hover:scale-110">
        <HeartPulse className="h-7 w-7 text-destructive/30" />
      </div>
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-destructive/20">
          <AvatarImage src={donor.avatar_url ?? undefined} alt={donor.full_name} />
          <AvatarFallback className="bg-destructive/10 text-sm font-bold text-destructive">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{donor.full_name || "Donor"}</p>
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <BadgeCheck className="h-3 w-3 text-destructive" /> Verified Donor
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-destructive/5 p-3">
        <div>
          <p className="text-xl font-bold text-foreground">{donor.blood_group || "—"}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Blood Group</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-foreground">{dist}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Distance</p>
        </div>
      </div>
      <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-destructive/70">
        Tap to view details
      </span>
    </button>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedDonor, setSelectedDonor] = useState<BloodDonorPopupData | null>(null);
  const { coords: browsingCoords } = useRealtimeLocation();
  const { data: allWorkers = [], isLoading: workersLoading } = useWorkers();
  const adminFeaturedIds = useFeaturedWorkerIds();
  const paidFeaturedIds = useNearbyFeaturedWorkerIds(browsingCoords ?? null);
  const featuredIds = useMemo(
    () => new Set<string>([...adminFeaturedIds, ...paidFeaturedIds]),
    [adminFeaturedIds, paidFeaturedIds]
  );
  const adminUserIds = useAdminUserIds();
  // Ad placements
  const bannerAds = useNativeAds("home_banner", browsingCoords);
  const inlineAds = useNativeAds("home_inline", browsingCoords);
  const feedAds = useNativeAds("home_feed", browsingCoords);

  const workers = useMemo(
    () =>
      allWorkers
        .filter((w) => w.userId !== user?.id)
        .filter((w) => !adminUserIds.has(w.userId)),
    [allWorkers, user?.id, adminUserIds]
  );

  const withDistance = useMemo(() => {
    return workers
      .map((w) => {
        if (
          browsingCoords &&
          typeof w.latitude === "number" &&
          typeof w.longitude === "number"
        ) {
          const d = calculateDistance(
            browsingCoords.latitude,
            browsingCoords.longitude,
            w.latitude,
            w.longitude
          );
          return { ...w, distance: parseFloat(d.toFixed(1)) };
        }
        return { ...w, distance: w.distance ?? Number.POSITIVE_INFINITY };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [workers, browsingCoords]);

  // Promoted (Sparks) campaigns: admin-configurable radius buckets + Top Rated
  const homepageRadii = useAppSetting("homepage_promoted_radii_km");
  const [r0 = 5, r1 = 10, r2 = 15] = Array.isArray(homepageRadii) ? homepageRadii : [5, 10, 15];
  const promoted5 = usePromotedNearby(browsingCoords, r0);
  const promoted10 = usePromotedNearby(browsingCoords, r1);
  const promoted15 = usePromotedNearby(browsingCoords, r2);
  const promotedTop = usePromotedTopRated(browsingCoords);

  // Blood donors — top 3 nearest verified donors
  const { data: donors = [] } = useQuery({
    queryKey: ["home_blood_donors", browsingCoords?.latitude, browsingCoords?.longitude],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, city, blood_group, latitude, longitude, phone, contact_methods" as any)
        .eq("is_blood_donor", true)
        .eq("donor_status", "active")
        .limit(20);
      if (error) throw error;
      const rows = ((data || []) as unknown) as DonorRow[];
      const ranked = rows
        .map((d) => {
          if (
            browsingCoords &&
            typeof d.latitude === "number" &&
            typeof d.longitude === "number"
          ) {
            return {
              ...d,
              distance: calculateDistance(
                browsingCoords.latitude,
                browsingCoords.longitude,
                d.latitude,
                d.longitude
              ),
            };
          }
          return { ...d, distance: Number.POSITIVE_INFINITY };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 6);
      return ranked;
    },
    staleTime: 5 * 60_000,
  });

  // Live ticker items from real data
  const tickerItems = useMemo(() => {
    const items: { text: string; hot?: boolean }[] = [];
    if (donors.length) items.push({ text: `${donors.length}+ verified blood donors active nearby`, hot: true });
    if (promoted5.length) items.push({ text: `${promoted5.length} promoted providers within ${r0} KM` });
    if (workers.length) items.push({ text: `${workers.length} total providers connected on Near Konnect` });
    items.push({ text: "Safety protocols for verified providers updated", hot: true });
    return items.length ? items : [{ text: "Welcome to Near Konnect — your hyperlocal network", hot: true }];
  }, [donors.length, promoted5.length, workers.length]);

  const submitSearch = (q: string) => {
    if (!q.trim()) return navigate("/discover");
    navigate(`/discover?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <AppLayout hideMobileHeader>
      {/* DARK CANVAS — overrides the AppLayout main padding so the design feels edge-to-edge */}
      <div className="-mx-4 -mt-[90px] -mb-[166px] bg-hero text-hero-foreground md:mx-0 md:mt-0 md:mb-0 md:rounded-3xl md:overflow-hidden md:border md:border-hero-foreground/10">
        {/* TICKER */}
        <div className="overflow-hidden border-b border-hero-foreground/10 bg-black/30 md:bg-hero-foreground/[0.03]">
          <div className="flex h-9 items-center">
            <div className="flex animate-[ticker_30s_linear_infinite] gap-10 whitespace-nowrap px-4">
              {[...tickerItems, ...tickerItems, ...tickerItems].map((t, i) => (
                <span
                  key={i}
                  className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    t.hot ? "text-primary" : "text-hero-muted"
                  }`}
                >
                  <span
                    className={`h-1 w-1 rounded-full ${
                      t.hot ? "bg-primary shadow-[0_0_10px_hsl(var(--primary))]" : "bg-hero-muted/60"
                    }`}
                  />
                  {t.text}
                </span>
              ))}
            </div>
          </div>
          <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-33.333%) } } @keyframes auto-carousel { from { transform: translate3d(0,0,0) } to { transform: translate3d(-50%,0,0) } } .auto-carousel-track { will-change: transform; animation-play-state: running; }`}</style>
        </div>

        {/* BRAND BAR — logo sits inside the hero, below the announcement ticker */}
        <div className="relative flex items-center justify-between px-5 pt-5 md:hidden">
          <Link to="/" className="inline-flex items-center">
            <img src={logoImg} alt="Near Konnect" className="h-9 object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <CurrentLocationChip />
            {user && <NotificationBell />}
          </div>
        </div>

        {/* HERO */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="relative px-5 pb-10 pt-6 text-center"
        >
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-10 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -left-20 top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-hero-muted ring-1 ring-white/10">
            <Zap className="h-3 w-3 text-primary" /> Hyperlocal Network
          </span>

          <h1 className="relative mx-auto mt-5 max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Hyperlocal connection,{" "}
            <span className="text-primary">redefined.</span>
          </h1>

          <p className="relative mx-auto mt-4 max-w-md text-sm text-hero-muted md:text-base">
            We connect you with trusted, verified providers in your immediate vicinity. We're the bridge — you take it from there.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); submitSearch(search); }}
            className="relative mx-auto mt-7 flex max-w-xl items-center gap-1 rounded-full bg-white/10 p-1.5 pl-4 ring-1 ring-white/10 backdrop-blur-sm focus-within:ring-primary/40"
          >
            <Search className="h-4 w-4 shrink-0 text-hero-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for professionals..."
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-hero-foreground placeholder:text-hero-muted focus:outline-none"
            />
            <Button type="submit" size="sm" className="h-9 shrink-0 rounded-full px-4">
              Explore
            </Button>
          </form>

          <div className="relative mt-4 flex flex-wrap justify-center gap-2">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => submitSearch(chip)}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-medium text-hero-foreground/90 backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-primary"
              >
                {chip}
              </button>
            ))}
          </div>
        </motion.section>

        {/* BLOOD KONNECT */}
        <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={1} className="mb-10">
          <div className="mb-4 flex items-end justify-between px-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">Blood Konnect</h2>
              <p className="text-xs text-hero-muted">Urgent availability in your vicinity</p>
            </div>
            <button
              onClick={() => navigate("/blood-donors")}
              className="flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {donors.length === 0 ? (
            <div className="mx-5 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <Droplet className="mx-auto mb-2 h-6 w-6 text-destructive" />
              <p className="text-sm font-semibold">No active donors nearby yet</p>
              <p className="mt-1 text-xs text-hero-muted">Be the first to register and save lives.</p>
              <Button size="sm" className="mt-3" onClick={() => navigate("/blood-donors")}>Become a Donor</Button>
            </div>
          ) : (
            <SteppedCarousel
              className="pb-3"
              gapClass="gap-4"
              trackClassName="pl-5 pr-5"
              dwellMs={2500}
              paused={!!selectedDonor}
              items={donors.map((d) => (
                <BloodDonorCarouselCard
                  key={d.user_id}
                  donor={d}
                  onOpen={(donor) => setSelectedDonor(toBloodDonorPopupData(donor))}
                />
              ))}
            />

          )}
        </motion.section>

        {/* AD: BANNER */}
        {bannerAds[0] && (
          <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={1.5} className="mb-10 px-5">
            <NativeAdCard ad={bannerAds[0]} variant="banner" viewerCoords={browsingCoords} />
          </motion.section>
        )}

        {/* PROMOTED SECTIONS — Top Rated + 5/10/15 KM (Sparks campaigns only) */}
        <PromotedSection
          title="Top Rated Providers"
          subtitle="Featured promoted listings"
          items={promotedTop}
          placement="top_rated"
          isAuthed={!!user}
          loading={workersLoading}
          custom={2}
          navigate={navigate}
        />

        {/* AD: INLINE */}
        {inlineAds[0] && (
          <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2.3} className="mb-10 px-5">
            <NativeAdCard ad={inlineAds[0]} variant="inline" viewerCoords={browsingCoords} />
          </motion.section>
        )}

        {/* FEATURED CAROUSEL */}
        <section className="mb-10 px-5">
          <FeaturedWorkersCarousel className="text-foreground" />
        </section>

        <PromotedSection
          title={`Within ${r0} KM`}
          subtitle="Promoted providers in your immediate vicinity"
          items={promoted5}
          placement={`nearby_${r0}km`}
          isAuthed={!!user}
          loading={workersLoading}
          custom={3}
          navigate={navigate}
          radiusKm={r0}
        />
        <PromotedSection
          title={`Within ${r1} KM`}
          subtitle="Nearby promoted providers"
          items={promoted10}
          placement={`nearby_${r1}km`}
          isAuthed={!!user}
          loading={workersLoading}
          custom={3.3}
          navigate={navigate}
          radiusKm={r1}
        />
        <PromotedSection
          title={`Within ${r2} KM`}
          subtitle="Promoted providers in your area"
          items={promoted15}
          placement={`nearby_${r2}km`}
          isAuthed={!!user}
          loading={workersLoading}
          custom={3.6}
          navigate={navigate}
          radiusKm={r2}
        />




        {/* COMMUNITY STATS */}
        <section className="mb-10 grid grid-cols-2 gap-3 px-5 md:grid-cols-4">
          {[
            { v: `${Math.max(workers.length, 25)}+`, l: "Active Providers" },
            { v: `${Math.max(donors.length, 10)}+`, l: "Verified Donors" },
            { v: "4.9/5", l: "Service Rating" },
            { v: "<15 m", l: "Avg Response" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-xl border border-white/5 bg-white/5 p-4 text-center backdrop-blur-sm"
            >
              <p className="text-2xl font-bold text-hero-foreground">{s.v}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-hero-muted">{s.l}</p>
            </div>
          ))}
        </section>

        {/* AD: FEED */}
        {feedAds[0] && (
          <section className="mb-12 px-5">
            <NativeAdCard ad={feedAds[0]} variant="feed" viewerCoords={browsingCoords} />
          </section>
        )}

        {/* FINAL CTA */}
        <section className="px-5 pb-16">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm md:p-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3 w-3" /> Get Connected
            </span>
            <h2 className="mx-auto mt-4 max-w-xl text-2xl font-bold tracking-tight md:text-3xl">
              Ready to find someone <span className="text-primary">near you?</span>
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-hero-muted">
              Browse verified local providers and reach out directly — no middlemen, no commissions.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button onClick={() => navigate("/discover")} className="rounded-full px-6">Browse Providers</Button>
              <Button
                variant="outline"
                onClick={() => navigate("/blood-donors")}
                className="rounded-full border-white/20 bg-transparent px-6 text-hero-foreground hover:bg-white/10"
              >
                Blood Konnect
              </Button>
            </div>
          </div>
        </section>
      </div>
      <BloodDonorPopup
        donor={selectedDonor}
        open={!!selectedDonor}
        onOpenChange={(o) => { if (!o) setSelectedDonor(null); }}
        isAuthed={!!user}
      />
    </AppLayout>
  );
};

/* ---------- Dark themed worker card matching the mockup ---------- */
const DarkWorkerCard = ({
  worker,
  index,
  featured,
  onConnect,
}: {
  worker: any;
  index: number;
  featured: boolean;
  onConnect: () => void;
}) => {
  return (
    <motion.button
      onClick={onConnect}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group relative flex min-w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04] text-left backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/30"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/5">
        {worker.profilePhoto ? (
          <img
            src={worker.profilePhoto}
            alt={worker.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center opacity-30">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-white/10 text-xl text-hero-foreground">
                {worker.name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 backdrop-blur-sm">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span className="text-[11px] font-bold text-hero-foreground">{worker.rating?.toFixed(1) || "5.0"}</span>
        </div>
        {(worker.verified || featured) && (
          <div className="absolute right-3 top-3 rounded bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
            {featured ? "Featured" : "Verified"}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-base font-bold text-hero-foreground">{worker.name}</p>
          <p className="text-xs text-hero-muted">{worker.profession}</p>
        </div>
        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <span className="flex items-center gap-1.5 text-[11px] text-hero-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            {isFinite(worker.distance) ? `${worker.distance} KM away` : "Nearby"}
          </span>
          <span className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-primary-foreground transition-opacity group-hover:opacity-90">
            Connect
          </span>
        </div>
      </div>
    </motion.button>
  );
};

type PromotedItem = {
  id: string;
  campaignId: string;
  distance: number;
} & Record<string, any>;

const PromotedSection = ({
  title, subtitle, items, placement, isAuthed, loading, custom, navigate, radiusKm,
}: {
  title: string;
  subtitle: string;
  items: PromotedItem[];
  placement: string;
  isAuthed: boolean;
  loading: boolean;
  custom: number;
  navigate: (path: string) => void;
  radiusKm?: number;
}) => {
  if (loading && items.length === 0) {
    return (
      <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={custom} className="mb-10">
        <div className="mb-5 px-5">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
        </div>
        <div className="flex gap-4 px-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 w-[280px] shrink-0 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
          ))}
        </div>
      </motion.section>
    );
  }
  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={custom} className="mb-10">
      <div className="mb-5 px-5">
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">
          {title} <span className="ml-2 text-sm font-normal text-hero-muted">• {subtitle}</span>
        </h2>
      </div>
      {items.length === 0 ? (
        <div className="mx-5 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm font-semibold text-hero-foreground">No ads currently running{radiusKm ? ` within ${radiusKm} KM` : ""}</p>
          <p className="mt-1 text-xs text-hero-muted">Check back soon for promoted providers in this area.</p>
        </div>
      ) : (
        <SteppedCarousel
          className="pb-3"
          trackClassName="pl-5 pr-5"
          dwellMs={2800}
          items={items.map((w) => (
            <div key={`${placement}-${w.id}`}>
              <WorkerAdCard
                worker={w as any}
                isAuthed={isAuthed}
                campaignId={w.campaignId}
                placement={placement}
              />
            </div>
          ))}
        />
      )}
    </motion.section>
  );
};

export default Home;
