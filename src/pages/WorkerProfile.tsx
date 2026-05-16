import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Clock3, MapPin, ShieldCheck, Star, Briefcase, CalendarPlus, Sparkles, EyeOff, MessageSquare } from "lucide-react";
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

import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import { calculateDistance } from "@/lib/geolocation";
import ContactMethodsBar from "@/components/ContactMethodsBar";
import { parseContactMethods, type ContactMethod } from "@/lib/contactMethods";

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

  const { data: dbWorker, isLoading: workerLoading, isError: workerError } = useQuery({
    queryKey: ["worker", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("workers")
        .select("*, profiles!workers_user_id_fkey_profiles(full_name, phone, avatar_url, use_whatsapp, contact_methods, show_contact)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: dbReviews = [], isLoading: reviewsLoading } = useQuery({
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

  if (workerLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (workerError || !dbWorker) {
    return (
      <AppLayout title="Error" subtitle="">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Worker profile not found</h2>
          <p className="text-muted-foreground mb-8">The worker you are looking for might have removed their profile or the link is invalid.</p>
          <Button onClick={() => navigate("/discover")}>Back to search</Button>
        </div>
      </AppLayout>
    );
  }

  const profilePhone = (dbWorker as any).profiles?.phone || "";
  const storedMethods = parseContactMethods((dbWorker as any).profiles?.contact_methods);
  const fallbackMethods: ContactMethod[] = profilePhone
    ? [
        { type: "phone", value: profilePhone },
        ...((dbWorker as any).profiles?.use_whatsapp ? [{ type: "whatsapp", value: profilePhone } as ContactMethod] : []),
      ]
    : [];
  const contactMethods: ContactMethod[] = storedMethods.length > 0 ? storedMethods : fallbackMethods;

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

  const handleInAppMessage = () => {
    void trackEvent("contact_click");
    if (!user) return;
    navigate(`/chat/${worker.userId}`);
  };

  const handleChannelClick = () => {
    void trackEvent("contact_click");
  };

  const initials = worker.name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppLayout title="" subtitle="">
      <div className="mx-auto max-w-3xl overflow-x-hidden">
        <Link to="/discover" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] border bg-card pb-8 shadow-premium"
        >
          {/* Dark hero header */}
          <div className="relative overflow-hidden bg-hero px-4 pt-5 pb-6 text-hero-foreground sm:px-5 sm:pt-6 md:px-8 md:pt-8 md:pb-8">
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
                <p className="text-sm text-hero-muted/80">{worker.profession}</p>
                {(worker.mainCategory || worker.subCategory) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {worker.mainCategory && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary-foreground ring-1 ring-primary/40">
                        {worker.mainCategory}
                      </span>
                    )}
                    {worker.subCategory && worker.subCategory !== worker.profession && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-hero-foreground">
                        {worker.subCategory}
                      </span>
                    )}
                  </div>
                )}
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

            {/* Contact options inside hero banner */}
            <div className="relative mt-6">
              {user ? (
                <ContactBlock
                  isOwner={user.id === worker.userId}
                  showContact={(dbWorker as any).profiles?.show_contact ?? true}
                  contactMethods={contactMethods}
                  onInAppMessage={handleInAppMessage}
                  onChannelClick={handleChannelClick}
                  workerId={worker.id}
                  workerName={worker.name}
                  trackConversion={() => void trackEvent("conversion")}
                />
              ) : (
                <AuthRequiredDialog title="Log in to contact" description="Please log in or sign up to contact this service.">
                  <Button className="w-full h-11 rounded-xl gap-2 shadow-sm">
                    <CalendarPlus className="h-4 w-4" /> Log in to contact
                  </Button>
                </AuthRequiredDialog>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="relative px-4 pt-5 sm:px-5 md:px-8 md:pt-6">

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1 rounded-2xl border p-3 text-center text-secondary bg-secondary-foreground">
                <ShieldCheck className="h-4 w-4 text-primary-foreground" />
                <span className="text-[11px] font-semibold text-secondary">Trust verified</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl border p-3 text-center bg-secondary-foreground">
                <Clock3 className="h-4 w-4 text-secondary" />
                <span className="text-[11px] font-semibold text-secondary">Replies fast</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl border p-3 text-center bg-secondary-foreground">
                <MapPin className="h-4 w-4 text-secondary" />
                <span className="text-[11px] font-semibold text-card-foreground">Local expert</span>
              </div>
            </div>

          </div>

          <div className="px-4 pb-6 sm:px-5 md:px-8">
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
      </div>
    </AppLayout>
  );
};

interface ContactBlockProps {
  isOwner: boolean;
  showContact: boolean;
  contactMethods: ContactMethod[];
  onInAppMessage: () => void;
  onChannelClick: () => void;
  workerId: string;
  workerName: string;
  trackConversion: () => void;
}

const ContactBlock = ({
  isOwner,
  showContact,
  contactMethods,
  onInAppMessage,
  onChannelClick,
  workerId,
  workerName,
  trackConversion,
}: ContactBlockProps) => {
  const canView = isOwner || showContact;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-3 backdrop-blur-sm">
      {canView ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <ContactMethodsBar
            methods={contactMethods}
            onInAppMessage={isOwner ? undefined : onInAppMessage}
            onChannelClick={onChannelClick}
            variant="hero"
          />
          <BookingDialog workerId={workerId} workerName={workerName}>
            <Button className="w-full gap-2 sm:w-auto" onClick={trackConversion}>
              <CalendarPlus className="h-4 w-4" /> Book Now
            </Button>
          </BookingDialog>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-xs text-hero-muted">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              This service pro has chosen to keep their direct contact details private. You can still
              message them in the app or book a slot.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button onClick={onInAppMessage} className="w-full gap-2 sm:w-auto">
              <MessageSquare className="h-4 w-4" /> Message in app
            </Button>
            <BookingDialog workerId={workerId} workerName={workerName}>
              <Button variant="secondary" className="w-full gap-2 sm:w-auto" onClick={trackConversion}>
                <CalendarPlus className="h-4 w-4" /> Book Now
              </Button>
            </BookingDialog>
          </div>
        </div>
      )}
    </div>
  );
};


export default WorkerProfile;
