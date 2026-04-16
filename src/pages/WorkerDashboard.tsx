import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  Clock,
  Compass,
  HeartPulse,
  MapPin,
  MessageSquare,
  Navigation,
  Save,
  Search,
  Star,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import AvatarUpload from "@/components/AvatarUpload";
import BloodDonationCard from "@/components/BloodDonationCard";
import StarRating from "@/components/StarRating";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkerProfile } from "@/hooks/useWorkerProfile";
import { getCurrentPosition } from "@/lib/geolocation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchConversationSummaries } from "@/lib/messages";

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: workerData, isLoading } = useWorkerProfile();
  const queryClient = useQueryClient();

  const [profession, setProfession] = useState("");
  const [experience, setExperience] = useState("");
  const [description, setDescription] = useState("");
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingLocation, setSettingLocation] = useState(false);

  useEffect(() => {
    if (workerData) {
      setProfession(workerData.profession || "");
      setExperience(String(workerData.experience || 0));
      setDescription(workerData.description || "");
      setAvailable(workerData.available);
    }
  }, [workerData]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const { data: reviews = [] } = useQuery({
    queryKey: ["my_reviews", workerData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles:customer_id(full_name)")
        .eq("worker_id", workerData!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workerData?.id,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["worker_bookings", workerData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, profiles:customer_id(full_name, phone, avatar_url)")
        .eq("worker_id", workerData!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workerData?.id,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["worker_conversations", user?.id],
    queryFn: async () => fetchConversationSummaries(user!.id),
    enabled: !!user,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user) return;
    const channelName = `worker-dash-${user.id}-${Math.random().toString(36).slice(2)}`;
    const ch = supabase.channel(channelName);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
      queryClient.invalidateQueries({ queryKey: ["worker_bookings"] });
    }).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
      queryClient.invalidateQueries({ queryKey: ["worker_conversations"] });
    });
    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, queryClient]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return "0";
    return (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const pendingBookings = bookings.filter((b: any) => b.status === "pending");
  const confirmedBookings = bookings.filter((b: any) => b.status === "confirmed");

  const handleSave = async () => {
    if (!workerData) return;
    setSaving(true);

    const { error: workerError } = await supabase
      .from("workers")
      .update({
        profession,
        experience: parseInt(experience) || 0,
        description,
        available,
      })
      .eq("id", workerData.id);

    setSaving(false);
    if (workerError) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Profile updated!");
      queryClient.invalidateQueries({ queryKey: ["my_worker_profile"] });
    }
  };

  const handleSetFixedLocation = async () => {
    if (!workerData) return;
    if (workerData.latitude && workerData.longitude) {
      toast.error("Service location is already fixed.");
      return;
    }
    setSettingLocation(true);
    try {
      const coords = await getCurrentPosition();
      await supabase
        .from("workers")
        .update({ latitude: coords.latitude, longitude: coords.longitude })
        .eq("id", workerData.id);
      toast.success("Fixed service location saved!");
      queryClient.invalidateQueries({ queryKey: ["my_worker_profile"] });
    } catch {
      toast.error("Could not get location. Please enable location access.");
    }
    setSettingLocation(false);
  };

  const handleAvatarUpload = async (url: string) => {
    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user!.id);
    queryClient.invalidateQueries({ queryKey: ["my_worker_profile"] });
  };

  const handleBookingAction = async (bookingId: string, action: "confirmed" | "rejected") => {
    const { error } = await supabase.from("bookings").update({ status: action }).eq("id", bookingId);
    if (error) toast.error("Failed to update booking");
    else {
      toast.success(`Booking ${action}!`);
      queryClient.invalidateQueries({ queryKey: ["worker_bookings"] });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!workerData) {
    return (
      <AppLayout title="Service Dashboard" subtitle="Create your service profile to start receiving local jobs.">
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="mb-4 text-muted-foreground">You don't have a service profile yet.</p>
          <Button onClick={() => navigate("/register?role=worker")}>Register as Service</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Service Dashboard"
      subtitle="Manage bookings, profile and chats with a fast mobile-first workflow."
      action={
        <Button className="h-10 gap-2 rounded-xl" onClick={() => navigate("/discover")}>
          <Search className="h-4 w-4" /> Explore
        </Button>
      }
    >
      <section className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: "Rating", value: avgRating, icon: Star },
            { label: "Reviews", value: String(reviews.length), icon: UserCheck },
            { label: "Bookings", value: String(bookings.length), icon: Calendar },
            { label: "Messages", value: String(conversations.length), icon: MessageSquare },
            { label: "Status", value: available ? "Available" : "Offline", icon: available ? CheckCircle : XCircle },
          ].map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border bg-card p-4">
              <div className="mb-2 inline-flex rounded-xl bg-muted p-2">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xl font-bold text-card-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <button onClick={() => navigate("/discover")} className="tap-feedback rounded-2xl border bg-card p-4 text-left">
            <Compass className="mb-2 h-5 w-5 text-primary" />
            <p className="font-semibold text-card-foreground">Find more demand</p>
            <p className="text-xs text-muted-foreground">See local categories and active jobs</p>
          </button>
          <button onClick={() => navigate("/blood-donors")} className="tap-feedback rounded-2xl border bg-card p-4 text-left">
            <HeartPulse className="mb-2 h-5 w-5 text-destructive" />
            <p className="font-semibold text-card-foreground">Urgent network</p>
            <p className="text-xs text-muted-foreground">Help with blood and emergency requests</p>
          </button>
          <button onClick={() => navigate("/messages")} className="tap-feedback rounded-2xl border bg-card p-4 text-left">
            <MessageSquare className="mb-2 h-5 w-5 text-secondary" />
            <p className="font-semibold text-card-foreground">Reply faster</p>
            <p className="text-xs text-muted-foreground">Keep your response time high</p>
          </button>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-2xl bg-muted p-1 md:grid-cols-6">
            <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
            <TabsTrigger value="profile" className="rounded-xl">Profile</TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-xl">Bookings</TabsTrigger>
            <TabsTrigger value="messages" className="rounded-xl">Messages</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-xl">Reviews</TabsTrigger>
            <TabsTrigger value="blood" className="rounded-xl">Blood</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="mb-3 font-semibold text-card-foreground">Pending requests ({pendingBookings.length})</h3>
                {pendingBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending requests right now.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingBookings.slice(0, 3).map((b: any) => (
                      <div key={b.id} className="rounded-xl bg-muted/50 p-3">
                        <p className="text-sm font-medium text-card-foreground">{b.profiles?.full_name || "Client"}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.service_description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="mb-3 font-semibold text-card-foreground">Upcoming ({confirmedBookings.length})</h3>
                {confirmedBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming confirmed jobs.</p>
                ) : (
                  <div className="space-y-2">
                    {confirmedBookings.slice(0, 3).map((b: any) => (
                      <div key={b.id} className="rounded-xl bg-muted/50 p-3">
                        <p className="text-sm font-medium text-card-foreground">{b.profiles?.full_name || "Client"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(b.booking_date).toLocaleDateString()} · {b.booking_time}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="mb-4 font-semibold text-card-foreground">Edit service profile</h2>
              <div className="mb-6 flex items-start gap-4">
                <AvatarUpload currentUrl={(workerData as any).profiles?.avatar_url} onUpload={handleAvatarUpload} />
                <div className="space-y-1">
                  <p className="font-semibold text-card-foreground">{(workerData as any).profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{(workerData as any).profiles?.phone}</p>
                  {workerData.verified && <Badge className="bg-success text-success-foreground">Verified</Badge>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Profession</Label>
                  <Input value={profession} onChange={(e) => setProfession(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Years of Experience</Label>
                  <Input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} className="mt-1.5" />
                </div>
                <div className="md:col-span-2">
                  <Label>About</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-muted p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Availability</p>
                  <p className="text-xs text-muted-foreground">{available ? "You are visible to clients" : "You are hidden from search"}</p>
                </div>
                <Switch checked={available} onCheckedChange={setAvailable} />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSetFixedLocation}
                  disabled={settingLocation || !!(workerData.latitude && workerData.longitude)}
                  className="gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  {workerData.latitude && workerData.longitude
                    ? "Fixed service location saved"
                    : settingLocation
                    ? "Detecting..."
                    : "Use current location as fixed service location"}
                </Button>
              </div>

              <div className="mt-3 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Location mode: Using your service location</p>
                {workerData.latitude && workerData.longitude ? (
                  <p className="mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {workerData.latitude.toFixed(4)}, {workerData.longitude.toFixed(4)}
                  </p>
                ) : (
                  <p className="mt-1">Set your fixed service location to appear in nearby results.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            {pendingBookings.length > 0 && (
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="mb-3 font-semibold text-card-foreground">Pending requests</h3>
                <div className="space-y-3">
                  {pendingBookings.map((b: any) => (
                    <div key={b.id} className="rounded-xl border border-warning/40 bg-muted/30 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-card-foreground">{b.profiles?.full_name || "Client"}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{b.service_description}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(b.booking_date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.booking_time}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleBookingAction(b.id, "confirmed")} className="gap-1">
                            <CheckCircle className="h-3 w-3" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleBookingAction(b.id, "rejected")} className="gap-1">
                            <XCircle className="h-3 w-3" /> Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border bg-card p-5">
              <h3 className="mb-3 font-semibold text-card-foreground">Confirmed and past bookings</h3>
              {bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings yet.</p>
              ) : (
                <div className="space-y-3">
                  {bookings.map((b: any) => (
                    <div key={b.id} className="rounded-xl bg-muted/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-card-foreground">{b.profiles?.full_name || "Client"}</p>
                          <p className="text-sm text-muted-foreground">{b.service_description}</p>
                        </div>
                        <Badge className={b.status === "confirmed" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>{b.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="messages">
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="mb-4 font-semibold text-card-foreground">Messages</h2>
              {conversations.length === 0 ? (
                <div className="py-10 text-center">
                  <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((c: any) => (
                    <Link key={c.userId} to={`/chat/${c.userId}`} className="flex items-center gap-4 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                        {c.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-card-foreground">{c.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{c.lastMessage}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(c.time).toLocaleDateString()}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="mb-4 font-semibold text-card-foreground">Reviews ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="rounded-xl bg-muted/50 p-4">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-card-foreground">{r.profiles?.full_name || "Anonymous"}</span>
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <StarRating rating={r.rating} size={14} />
                      {r.review_text && <p className="mt-2 text-sm text-muted-foreground">{r.review_text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="blood">
            <BloodDonationCard />
          </TabsContent>
        </Tabs>
      </section>
    </AppLayout>
  );
};

export default WorkerDashboard;