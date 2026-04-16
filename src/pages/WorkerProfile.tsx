import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Clock3, MapPin, Phone, ShieldCheck, Star, Briefcase, MessageSquare, CalendarPlus } from "lucide-react";
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

const WorkerProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
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
    city: dbWorker.city || "",
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
    <AppLayout title="Service Profile" subtitle="Trust signals, reviews, and quick booking in one place.">
      <div className="mx-auto max-w-3xl">
        <Link to="/discover" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to search
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border rounded-2xl p-6 md:p-8 pb-24 md:pb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {worker.profilePhoto ? (
              <img src={worker.profilePhoto} alt={worker.name} className="w-24 h-24 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-accent flex items-center justify-center text-2xl font-bold text-accent-foreground shrink-0">{initials}</div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-card-foreground">{worker.name}</h1>
                {worker.verified && <CheckCircle className="w-5 h-5 text-primary" />}
              </div>
              <p className="text-muted-foreground mb-3">{worker.profession} · {worker.city}</p>
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-star fill-star" />
                  <span className="font-semibold text-card-foreground">{avgRating}</span>
                  <span className="text-muted-foreground">({dbReviews.length} reviews)</span>
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Briefcase className="w-4 h-4" /> {worker.experience} years exp.
                </span>
              </div>
              <div className="mt-3">
                <Badge variant={worker.available ? "default" : "secondary"} className={worker.available ? "bg-success text-success-foreground" : ""}>
                  {worker.available ? "Available Now" : "Currently Busy"}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-muted p-2 text-center">
                  <ShieldCheck className="mx-auto mb-1 h-4 w-4 text-primary" />
                  Trust Verified
                </div>
                <div className="rounded-xl bg-muted p-2 text-center">
                  <Clock3 className="mx-auto mb-1 h-4 w-4 text-secondary" />
                  Replies fast
                </div>
                <div className="rounded-xl bg-muted p-2 text-center">
                  <MapPin className="mx-auto mb-1 h-4 w-4 text-warning" />
                  Local expert
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 hidden gap-3 md:flex md:flex-wrap">
             {user ? (
                 <Button variant="hero" className="flex-1 gap-2" asChild>
                  <a href={`tel:${worker.phone}`} onClick={() => void trackEvent("contact_click")}><Phone className="w-4 h-4" /> Call Now</a>
               </Button>
             ) : (
               <AuthRequiredDialog title="Log in to contact" description="Please log in or sign up to contact this service.">
                 <Button variant="hero" className="flex-1 gap-2">
                   <Phone className="w-4 h-4" /> Contact
                 </Button>
               </AuthRequiredDialog>
             )}
             {user ? (
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { void trackEvent("contact_click"); handleMessage(); }}>
                 <MessageSquare className="w-4 h-4" /> Contact
               </Button>
             ) : (
               <AuthRequiredDialog title="Log in to contact" description="Please log in or sign up to contact this service.">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => void trackEvent("contact_click")}>
                   <MessageSquare className="w-4 h-4" /> Contact
                 </Button>
               </AuthRequiredDialog>
             )}
             {user && (
              <BookingDialog workerId={worker.id} workerName={worker.name}>
                <Button variant="default" className="flex-1 gap-2" onClick={() => void trackEvent("conversion")}>
                  <CalendarPlus className="w-4 h-4" /> Book Now
                </Button>
              </BookingDialog>
            )}
          </div>

          <div className="mt-8">
            <h2 className="font-semibold text-card-foreground mb-2">About</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{worker.description}</p>
          </div>

          <div className="mt-6">
            <h2 className="font-semibold text-card-foreground mb-2">Service Areas</h2>
            <div className="flex gap-2 flex-wrap">
              {worker.serviceAreas.map((area: string) => <Badge key={area} variant="outline">{area}</Badge>)}
            </div>
          </div>

          {/* Write Review */}
          {user && user.id !== worker.userId && (
            <div className="mt-8 p-4 rounded-xl bg-muted/50">
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
                  <div key={r.id} className="p-4 rounded-xl bg-muted/50">
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
        </motion.div>

        <div className="fixed inset-x-0 bottom-20 z-40 px-4 md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-2 gap-2 rounded-2xl border bg-card/95 p-2 shadow-premium backdrop-blur-xl">
            {user ? (
              <Button variant="outline" className="rounded-xl" onClick={handleMessage}>
                <MessageSquare className="mr-1 h-4 w-4" /> Contact
              </Button>
            ) : (
              <AuthRequiredDialog title="Log in to contact" description="Please log in or sign up to contact this service.">
                <Button variant="outline" className="rounded-xl" onClick={() => void trackEvent("contact_click")}>
                  <MessageSquare className="mr-1 h-4 w-4" /> Contact
                </Button>
              </AuthRequiredDialog>
            )}
            {user ? (
              <BookingDialog workerId={worker.id} workerName={worker.name}>
                <Button className="w-full rounded-xl" onClick={() => void trackEvent("conversion")}>Book Now</Button>
              </BookingDialog>
            ) : (
              <AuthRequiredDialog title="Log in to book" description="Please log in or sign up to book this service.">
                <Button className="rounded-xl">Book Now</Button>
              </AuthRequiredDialog>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default WorkerProfile;
