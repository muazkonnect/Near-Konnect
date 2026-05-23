import { useParams, useNavigate, useLocation } from "react-router-dom";
import { MapPin, Copy } from "lucide-react";
import { ArrowLeft, MoreVertical, Star, ShieldCheck, Briefcase, Zap, Send, Mail, Phone, MessageSquare, Video, Lock, CalendarPlus, EyeOff, Crown, BadgeCheck } from "lucide-react";
import WhatsappIcon from "@/components/icons/WhatsappIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";
import BookingDialog from "@/components/BookingDialog";
import ContactMethodsBar from "@/components/ContactMethodsBar";
import { useWorkerPortfolio } from "@/components/PortfolioManager";
import { parseContactMethods, type ContactMethod } from "@/lib/contactMethods";
import { getExpertise } from "@/lib/categoryExpertise";
import { isValidWorkerUid, normalizeWorkerUid } from "@/lib/workerUid";
import { calculateDistance, getCurrentPosition, type Coords } from "@/lib/geolocation";

const WorkerProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navDistanceRaw = (location.state as any)?.distance;
  const navDistance =
    typeof navDistanceRaw === "number" && navDistanceRaw > 0 && isFinite(navDistanceRaw)
      ? navDistanceRaw
      : null;
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const queryClient = useQueryClient();
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  const trackEvent = async (eventType: "profile_view" | "contact_click" | "conversion") => {
    if (!id || !dbWorker) return;
    await (supabase as any).from("service_analytics_events").insert({
      service_id: id,
      owner_user_id: dbWorker.user_id,
      event_type: eventType,
      source: "app",
    });
  };

  const isUuid = !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const normalizedUid = id ? normalizeWorkerUid(id) : "";
  const isValidUid = !isUuid && isValidWorkerUid(normalizedUid);
  const lookupValid = isUuid || isValidUid;

  const { data: dbWorker, isLoading: workerLoading, isError: workerError } = useQuery({
    queryKey: ["worker", id],
    queryFn: async () => {
      if (!id || !lookupValid) return null;
      const query = (supabase as any)
        .from("workers")
        .select("*, profiles!workers_user_id_fkey_profiles(full_name, avatar_url, use_whatsapp, show_contact, profile_phones(phone), profile_contact_methods(methods))")
        .eq(isUuid ? "id" : "uid", isUuid ? id : normalizedUid)
        .maybeSingle();
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!id && lookupValid,
  });

  const { data: dbReviews = [] } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles:customer_id(full_name, avatar_url)")
        .eq("worker_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: portfolio = [] } = useWorkerPortfolio(dbWorker?.id);


  useEffect(() => {
    if (!dbWorker || !id) return;
    void trackEvent("profile_view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dbWorker?.user_id]);

  // Fetch user geolocation only if we don't have a distance from nav state
  useEffect(() => {
    if (navDistance != null || userCoords) return;
    let cancelled = false;
    getCurrentPosition()
      .then((c) => { if (!cancelled) setUserCoords(c); })
      .catch(() => { /* permission denied or unavailable */ });
    return () => { cancelled = true; };
  }, [navDistance, userCoords]);

  const distanceKm = useMemo<number | null>(() => {
    let raw: number | null = null;
    if (navDistance != null) {
      raw = navDistance;
    } else {
      const wLat = (dbWorker as any)?.latitude;
      const wLng = (dbWorker as any)?.longitude;
      if (userCoords && typeof wLat === "number" && typeof wLng === "number") {
        raw = calculateDistance(userCoords.latitude, userCoords.longitude, wLat, wLng);
      }
    }
    if (raw == null || !isFinite(raw) || raw < 0) return null;
    return parseFloat(raw.toFixed(raw < 10 ? 1 : 0));
  }, [navDistance, userCoords, dbWorker]);

  const hasDist = distanceKm != null;
  const distanceLabel = hasDist
    ? distanceKm! < 1
      ? `${Math.round(distanceKm! * 1000)} m`
      : `${distanceKm} km`
    : null;

  if (workerLoading) {
    return (
      <AppLayout hideMobileHeader>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (workerError || !dbWorker) {
    return (
      <AppLayout hideMobileHeader>
        <div className="px-4 py-16 text-center">
          <h2 className="mb-4 text-2xl font-bold">Worker profile not found</h2>
          <Button onClick={() => navigate("/discover")}>Back to search</Button>
        </div>
      </AppLayout>
    );
  }

  const profilePhone = (dbWorker as any).profiles?.profile_phones?.phone || "";
  const storedMethods = parseContactMethods((dbWorker as any).profiles?.profile_contact_methods?.methods);
  const fallbackMethods: ContactMethod[] = profilePhone
    ? [
        { type: "phone", value: profilePhone },
        ...((dbWorker as any).profiles?.use_whatsapp ? [{ type: "whatsapp", value: profilePhone } as ContactMethod] : []),
      ]
    : [];
  const contactMethods: ContactMethod[] = storedMethods.length > 0 ? storedMethods : fallbackMethods;
  const showContact = (dbWorker as any).profiles?.show_contact ?? true;

  const worker = {
    id: dbWorker.id,
    userId: dbWorker.user_id,
    name: (dbWorker as any).profiles?.full_name || "Unknown",
    profession: dbWorker.profession || "General Service",
    mainCategory: (dbWorker as any).main_category || "",
    subCategory: (dbWorker as any).sub_category || "",
    experience: dbWorker.experience,
    available: dbWorker.available,
    verified: dbWorker.verified,
    description: dbWorker.description || "",
    serviceAreas: dbWorker.service_areas || [],
    profilePhoto: (dbWorker as any).profiles?.avatar_url || "",
    bannerUrl: (dbWorker as any).banner_url || "",
    
  };

  const isOwner = !!user && user.id === worker.userId;
  const avgRating = dbReviews.length
    ? (dbReviews.reduce((s: number, r: any) => s + r.rating, 0) / dbReviews.length).toFixed(1)
    : "0.0";
  const expertise = getExpertise(worker.mainCategory, worker.subCategory, [worker.profession, ...worker.serviceAreas], 3);
  const initials = worker.name.split(" ").filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const phoneSan = profilePhone.replace(/[^\d+]/g, "");

  const handleSubmitReview = async () => {
    if (!user) { toast.error("Please log in to leave a review"); return; }
    if (!reviewText.trim()) { toast.error("Please write a review"); return; }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      worker_id: id!,
      customer_id: user.id,
      rating: reviewRating,
      review_text: reviewText.trim(),
    });
    setSubmittingReview(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Review submitted!");
      setReviewText("");
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ["reviews", id] });
    }
  };

  return (
    <AppLayout hideMobileHeader>
      <div className="-mx-4 -mt-[90px] -mb-[166px] min-h-screen bg-hero text-hero-foreground">
        {/* Top App Bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-hero/85 px-5 py-3 backdrop-blur-md">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition hover:bg-white/10"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Worker Profile</h1>
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition hover:bg-white/10" aria-label="More">
            <MoreVertical className="h-5 w-5" />
          </button>
        </header>

        {/* Banner */}
        <div className="relative -mt-px h-44 w-full overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-hero sm:h-56">
          {worker.bannerUrl ? (
            <img src={worker.bannerUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          ) : worker.profilePhoto ? (
            <img src={worker.profilePhoto} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-sm" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-hero/30 via-hero/40 to-hero" />
        </div>

        <main className="mx-auto max-w-2xl px-5 pb-40 pt-6 -mt-16 relative">
          {/* 1. Compact Header */}
          <section className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 rounded-full bg-primary opacity-20 blur transition duration-700 group-hover:opacity-30" />
              <Avatar className="relative z-10 h-32 w-32 border-2 border-primary">
                <AvatarImage src={worker.profilePhoto} alt={worker.name} className="object-cover" />
                <AvatarFallback className="bg-white/10 text-2xl font-bold text-primary">{initials}</AvatarFallback>
              </Avatar>
              {worker.verified && (
                <div className="absolute bottom-1 right-1 z-20 rounded-full border-4 border-hero bg-primary p-1 text-primary-foreground">
                  <BadgeCheck className="h-4 w-4" />
                </div>
              )}
            </div>

            <div className="mt-0.5 text-center">
              <div className="flex items-center justify-center gap-2 flex-nowrap">
                <h2 className="text-[22px] font-black tracking-tight text-hero-foreground">{worker.name}</h2>
                {worker.verified && (
                  <Crown className="h-4 w-4 text-amber-400" fill="currentColor" aria-label="Premium" />
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-stretch justify-center gap-2">
                {(dbWorker as any).uid && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText((dbWorker as any).uid);
                      toast.success("Worker ID copied");
                    }}
                    title="Click to copy"
                    className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur transition hover:border-primary/40 hover:bg-white/10"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-hero-muted">ID</span>
                    <span className="h-3 w-px bg-white/15" />
                    <span className="font-mono text-xs font-semibold tracking-wider text-hero-foreground">
                      {(dbWorker as any).uid}
                    </span>
                    <Copy className="h-3 w-3 text-hero-muted opacity-0 transition group-hover:opacity-100" />
                  </button>
                )}
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1.5 text-primary shadow-[0_0_18px_-6px_hsl(var(--primary)/0.8)]">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="h-3 w-px bg-primary/30" />
                  {hasDist ? (
                    <>
                      <span className="font-sora text-sm font-bold leading-none">{distanceLabel}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">away</span>
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">distance n/a</span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-primary">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-semibold">{avgRating}</span>
                <span className="text-xs text-hero-muted">({dbReviews.length} Reviews)</span>
              </div>
            </div>
          </section>

          {/* 2. Qualifications — Bento Grid */}
          <section className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-hero-muted">Category</span>
              <span className="block font-sora text-base font-semibold uppercase">{worker.mainCategory || "—"}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-hero-muted">Sub-Category</span>
              <span className="block font-sora text-base font-semibold uppercase">{worker.subCategory || "—"}</span>
            </div>
            <div className="col-span-2 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 to-transparent p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-hero-muted">Top Expertise</span>
              </div>
              {expertise.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {expertise.map((e) => (
                    <span
                      key={e}
                      className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-hero-muted">—</span>
              )}
            </div>
          </section>

          {/* Portfolio gallery */}
          {portfolio.length > 0 && (
            <section className="mb-5">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider">Portfolio</h3>
                <span className="text-xs text-hero-muted">{portfolio.length} {portfolio.length === 1 ? "image" : "images"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {portfolio.map((p) => (
                  <a
                    key={p.id}
                    href={p.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/5"
                  >
                    <img src={p.image_url} alt={p.caption || "Work sample"} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* 3. Horizontal Metrics */}
          <section className="mb-5 grid grid-cols-3 gap-2">
            <Metric
              icon={<ShieldCheck className="h-5 w-5 text-primary" />}
              label="Status"
              value={worker.verified ? "Verified" : "Pending"}
            />
            <Metric
              icon={<Briefcase className="h-5 w-5 text-primary" />}
              label="Exp."
              value={`${worker.experience} ${worker.experience === 1 ? "Year" : "Years"}`}
            />
            <Metric
              icon={<Zap className="h-5 w-5 text-primary" />}
              label="Reply"
              value={worker.available ? "< 15m" : "Offline"}
            />
          </section>

          {/* 4. Quick Contact Icons — only saved methods */}
          {showContact && (contactMethods.filter((m) => (m.value || "").trim()).length > 0 || true) && (
            <section className="mb-5 flex justify-center">
              <ContactMethodsBar
                methods={contactMethods.filter((m) => (m.value || "").trim())}
                onInAppMessage={() => { void trackEvent("contact_click"); user ? navigate(`/chat/${worker.userId}`) : navigate("/login"); }}
                onChannelClick={() => void trackEvent("contact_click")}
                variant="hero"
              />
            </section>
          )}

          {/* 5. Give a Review */}
          {user && !isOwner && (
            <section className="mb-5">
              <div className="mb-2 px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider">Give a Review</h3>
              </div>
              <div className="flex flex-col gap-4 rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-hero-muted">How was your experience?</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setReviewRating(n)} className="focus:outline-none" aria-label={`${n} stars`}>
                        <Star className={`h-7 w-7 ${n <= reviewRating ? "fill-primary text-primary" : "text-hero-muted"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  rows={3}
                  placeholder="Share your feedback here..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="resize-none border-white/15 bg-white/5 text-sm text-hero-foreground placeholder:text-hero-muted/60 focus-visible:border-primary/60 focus-visible:ring-0"
                />
                <Button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="h-11 w-full gap-2 rounded-lg shadow-lg shadow-primary/10"
                >
                  <Send className="h-4 w-4" />
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </section>
          )}

          {/* Reviews */}
          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider">Recent Reviews</h3>
              <span className="text-xs text-hero-muted">{dbReviews.length} total</span>
            </div>
            {dbReviews.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-hero-muted">
                No reviews yet.
              </div>
            ) : (
              <div className="hide-scrollbar flex snap-x gap-3 overflow-x-auto pb-2">
                {dbReviews.slice(0, 10).map((r: any) => (
                  <div
                    key={r.id}
                    className="flex min-w-[280px] snap-start flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {r.profiles?.avatar_url ? (
                          <img src={r.profiles.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-white/10" />
                        )}
                        <span className="text-xs font-semibold">{r.profiles?.full_name || "Anonymous"}</span>
                      </div>
                      <div className="flex text-primary">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`h-3 w-3 ${n <= r.rating ? "fill-current" : "opacity-30"}`} />
                        ))}
                      </div>
                    </div>
                    {r.review_text && (
                      <p className="line-clamp-2 text-xs text-hero-muted">{r.review_text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Auth CTA under reviews */}
          {!user && (
            <section className="mb-5">
              <AuthRequiredDialog title="Log in to contact" description="Sign in to contact this professional.">
                <Button className="h-11 w-full gap-2 rounded-lg text-sm font-semibold shadow-lg shadow-primary/10">
                  <Mail className="h-4 w-4" /> Log in to contact
                </Button>
              </AuthRequiredDialog>
            </section>
          )}

          {/* Booking + Call for logged in users */}
          {user && !isOwner && (
            <section className="mb-5 flex gap-2">
              <BookingDialog workerId={worker.id} workerName={worker.name}>
                <Button
                  variant="outline"
                  className="h-11 flex-1 gap-2 rounded-lg border-white/15 bg-white/5 text-sm font-semibold text-hero-foreground hover:bg-white/10"
                  onClick={() => void trackEvent("conversion")}
                >
                  <CalendarPlus className="h-4 w-4" /> Book
                </Button>
              </BookingDialog>
              <Button
                className="h-11 flex-[1.2] gap-2 rounded-lg text-sm font-semibold shadow-lg shadow-primary/10"
                onClick={() => {
                  void trackEvent("contact_click");
                  if (phoneSan) window.location.href = `tel:${phoneSan}`;
                  else navigate(`/chat/${worker.userId}`);
                }}
              >
                <Phone className="h-4 w-4 fill-current" /> Call Now
              </Button>
            </section>
          )}
        </main>

        <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.hide-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      </div>
    </AppLayout>
  );
};

const Metric = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
    {icon}
    <p className="text-[10px] font-semibold uppercase tracking-wider text-hero-muted">{label}</p>
    <p className="text-xs font-semibold">{value}</p>
  </div>
);

const ActionCircle = ({
  children,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    onClick={onClick}
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 transition hover:bg-primary/10 active:scale-90"
    {...rest}
  >
    {children}
  </button>
);

export default WorkerProfile;
