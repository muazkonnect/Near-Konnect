import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Clock3, MapPin, Phone, ShieldCheck, Star, Briefcase, MessageSquare, CalendarPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import StarRating from "@/components/StarRating";
import BookingDialog from "@/components/BookingDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";
import WorkersMap from "@/components/WorkersMap";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import { calculateDistance } from "@/lib/geolocation";

const WorkerProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const { coords: userCoords } = useRealtimeLocation();

  const trackEvent = async (eventType: "profile_view" | "contact_click" | "conversion") => {
    if (!id || !dbWorker) return;
    await (supabase as any).from("service_analytics_events").insert({
      service_id: id,
      owner_user_id: dbWorker.user_id,
      event_type: eventType,
      source: "app",
    });
  };

  const { data: dbWorker } = useQuery({
    queryKey: ["worker", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*, profiles(full_name, phone, avatar_url)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: dbReviews = [] } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles:customer_id(full_name)")
        .eq("worker_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!dbWorker || !id) return;
    void trackEvent("profile_view");
  }, [id, dbWorker?.user_id]);

  if (!dbWorker) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const worker = {
    id: dbWorker.id,
    userId: dbWorker.user_id,
    name: (dbWorker as any).profiles?.full_name || "Unknown",
    profession: dbWorker.profession,
    experience: dbWorker.experience,
    available: dbWorker.available,
    verified: dbWorker.verified,
    phone: (dbWorker as any).profiles?.phone || "",
    description: dbWorker.description || "",
    serviceAreas: dbWorker.service_areas || [],
    profilePhoto: (dbWorker as any).profiles?.avatar_url || "",
  };

  const avgRating = dbReviews.length
    ? (dbReviews.reduce((s: number, r: any) => s + r.rating, 0) / dbReviews.length).toFixed(1)
    : "0";

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

  const handleMessage = () => navigate(`/chat/${worker.userId}`);

  const initials = worker.name.split(" ").map(n => n[0]).join("");

  return (
    <AppLayout title="" subtitle="">
      <div className="mx-auto max-w-3xl overflow-x-hidden">
        <Link to="/discover" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] border bg-card pb-44 shadow-premium md:pb-8"
        >
          {/* Dark hero header */}
          <div className="relative overflow-hidden bg-hero px-5 pt-6 pb-6 text-hero-foreground md:px-8 md:pt-8 md:pb-8">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{
              backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }} />
            <div className="relative flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-hero-muted">
                <Sparkles className="h-3 w-3 text-primary" /> Service profile
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  worker.available ? "bg-primary text-primary-foreground" : "bg-white/10 text-hero-muted"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${worker.available ? "bg-primary-foreground" : "bg-hero-muted"}`} />
                {worker.available ? "Available now" : "Currently busy"}
              </span>
            </div>

            {/* Avatar + name + profession — inside the banner */}
            <div className="relative mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {worker.profilePhoto ? (
                <img src={worker.profilePhoto} alt={worker.name} className="h-24 w-24 shrink-0 rounded-3xl border-4 border-hero object-cover shadow-md ring-2 ring-primary/30" />
              ) : (
                <div className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl border-4 border-hero text-2xl font-bold shadow-md ring-2 ring-primary/30 text-primary-foreground bg-primary">{initials}</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-hero-foreground">{worker.name}</h1>
                  {worker.verified && <CheckCircle className="h-5 w-5 text-primary" />}
                </div>
                <p className="text-sm text-hero-muted">{worker.profession}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-hero-foreground backdrop-blur-sm">
                    <Star className="h-3 w-3 fill-star text-star" />
                    {avgRating}
                    <span className="text-hero-muted">({dbReviews.length})</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-hero-muted backdrop-blur-sm">
                    <Briefcase className="h-3.5 w-3.5" /> {worker.experience} yrs exp.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="relative px-5 pt-5 md:px-8 md:pt-6">

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1 rounded-2xl border p-3 text-center text-secondary bg-primary">
                <ShieldCheck className="h-4 w-4 text-primary-foreground" />
                <span className="text-[11px] font-semibold text-secondary">Trust verified</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl border p-3 text-center bg-secondary">
                <Clock3 className="h-4 w-4 text-secondary-foreground" />
                <span className="text-[11px] font-semibold text-secondary-foreground">Replies fast</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl border p-3 text-center bg-primary">
                <MapPin className="h-4 w-4 text-secondary" />
                <span className="text-[11px] font-semibold text-card-foreground">Local expert</span>
              </div>
            </div>

            {/* Desktop actions */}
            <div className="mt-5 hidden gap-2 md:flex md:flex-wrap">
              {user ? (
                <Button className="flex-1 gap-2" asChild onClick={() => void trackEvent("contact_click")}>
                  <a href={`tel:${worker.phone}`}><Phone className="h-4 w-4" /> Call Now</a>
                </Button>
              ) : (
                <AuthRequiredDialog title="Log in to contact" description="Please log in or sign up to contact this service.">
                  <Button className="flex-1 gap-2"><Phone className="h-4 w-4" /> Call Now</Button>
                </AuthRequiredDialog>
              )}
              {user ? (
                <Button variant="outline" className="flex-1 gap-2 bg-secondary-foreground hover:bg-secondary-foreground/90 border-border text-foreground" onClick={() => { void trackEvent("contact_click"); handleMessage(); }}>
                  <MessageSquare className="h-4 w-4" /> Message
                </Button>
              ) : (
                <AuthRequiredDialog title="Log in to contact" description="Please log in or sign up to contact this service.">
                  <Button variant="outline" className="flex-1 gap-2"><MessageSquare className="h-4 w-4" /> Message</Button>
                </AuthRequiredDialog>
              )}
              {user && (
                <BookingDialog workerId={worker.id} workerName={worker.name}>
                  <Button variant="dark" className="flex-1 gap-2" onClick={() => void trackEvent("conversion")}>
                    <CalendarPlus className="h-4 w-4" /> Book Now
                  </Button>
                </BookingDialog>
              )}
            </div>
          </div>

          <div className="px-5 pb-6 md:px-8">
            <div className="mt-6">
              <h2 className="font-semibold text-card-foreground mb-2">About</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{worker.description || "No description provided yet."}</p>
            </div>

            <div className="mt-6">
              <h2 className="font-semibold text-card-foreground mb-2">Service Areas</h2>
              <div className="flex gap-2 flex-wrap">
                {worker.serviceAreas.map((area: string) => <Badge key={area} variant="outline">{area}</Badge>)}
              </div>
            </div>

            {dbWorker.latitude && dbWorker.longitude && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-card-foreground">Pinned Service Location</h2>
                  {userCoords && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {calculateDistance(userCoords.latitude, userCoords.longitude, dbWorker.latitude, dbWorker.longitude).toFixed(2)} km away
                    </span>
                  )}
                </div>
                <div className="md:hidden">
                  <WorkersMap
                    workers={[{ id: dbWorker.id, name: worker.name, latitude: dbWorker.latitude, longitude: dbWorker.longitude }]}
                    userCoords={userCoords}
                    height="220px"
                  />
                </div>
                <div className="hidden md:block">
                  <WorkersMap
                    workers={[{ id: dbWorker.id, name: worker.name, latitude: dbWorker.latitude, longitude: dbWorker.longitude }]}
                    userCoords={userCoords}
                    height="320px"
                  />
                </div>
              </div>
            )}

            {user && user.id !== worker.userId && (
              <div className="mt-8 p-4 rounded-2xl bg-muted/50">
                <h2 className="font-semibold text-card-foreground mb-3">Leave a Review</h2>
                <div className="flex items-center gap-2 mb-3">
                  <Label className="text-sm">Rating:</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setReviewRating(n)} className="focus:outline-none">
                        <Star className={`w-5 h-5 ${n <= reviewRating ? "text-star fill-star" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea placeholder="Write your review..." value={reviewText} onChange={e => setReviewText(e.target.value)} rows={3} className="mb-3" />
                <Button onClick={handleSubmitReview} disabled={submittingReview} size="sm">
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            )}

            <div className="mt-8">
              <h2 className="font-semibold text-card-foreground mb-4">Reviews ({dbReviews.length})</h2>
              {dbReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {dbReviews.map((r: any) => (
                    <div key={r.id} className="p-4 rounded-2xl bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-card-foreground">{r.profiles?.full_name || "Anonymous"}</span>
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <StarRating rating={r.rating} size={14} />
                      {r.review_text && <p className="text-sm text-muted-foreground mt-2">{r.review_text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="fixed inset-x-0 bottom-20 z-40 px-4 md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-2 gap-2 rounded-full bg-hero p-2 shadow-premium min-w-0">
            {user ? (
              <Button variant="ghost" className="rounded-full text-hero-foreground hover:bg-white/10" onClick={handleMessage}>
                <MessageSquare className="mr-1 h-4 w-4" /> Message
              </Button>
            ) : (
              <AuthRequiredDialog title="Log in to contact" description="Please log in or sign up to contact this service.">
                <Button variant="ghost" className="rounded-full text-hero-foreground hover:bg-white/10" onClick={() => void trackEvent("contact_click")}>
                  <MessageSquare className="mr-1 h-4 w-4" /> Message
                </Button>
              </AuthRequiredDialog>
            )}
            {user ? (
              <Button className="w-full rounded-full" asChild onClick={() => void trackEvent("contact_click")}>
                <a href={`tel:${worker.phone}`}><Phone className="mr-1 h-4 w-4" /> Call Now</a>
              </Button>
            ) : (
              <AuthRequiredDialog title="Log in to call" description="Please log in or sign up to call this service.">
                <Button className="rounded-full"><Phone className="mr-1 h-4 w-4" /> Call Now</Button>
              </AuthRequiredDialog>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default WorkerProfile;
