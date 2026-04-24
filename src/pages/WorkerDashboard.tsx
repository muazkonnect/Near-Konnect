import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  Clock,
  Compass,
  HeartPulse,
  LayoutDashboard,
  Lock,
  KeyRound,
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
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import RequestFeaturedDialog from "@/components/RequestFeaturedDialog";

import StarRating from "@/components/StarRating";
import AppLayout from "@/components/AppLayout";
import DashboardNav from "@/components/DashboardNav";
import WorkersMap from "@/components/WorkersMap";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkerProfile } from "@/hooks/useWorkerProfile";
import { getCurrentPosition } from "@/lib/geolocation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchConversationSummaries } from "@/lib/messages";
import { useNotifications, markRead } from "@/hooks/useNotifications";
import ContactMethodsEditor from "@/components/ContactMethodsEditor";
import { type ContactMethod, parseContactMethods, validateContactMethods, sanitizePhone, normalizeContactMethods } from "@/lib/contactMethods";

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: workerData, isLoading } = useWorkerProfile();
  const queryClient = useQueryClient();

  const [profession, setProfession] = useState("");
  const [experience, setExperience] = useState("");
  const [description, setDescription] = useState("");
  const [available, setAvailable] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([{ type: "phone", value: "" }]);
  const [saving, setSaving] = useState(false);
  const [settingLocation, setSettingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { unreadByType } = useNotifications();

  useEffect(() => {
    if (activeTab === "messages") markRead((n) => n.type === "message");
    if (activeTab === "bookings") markRead((n) => n.type === "booking");
  }, [activeTab]);

  useEffect(() => {
    if (workerData) {
      setProfession(workerData.profession || "");
      setExperience(String(workerData.experience || 0));
      setDescription(workerData.description || "");
      setAvailable(workerData.available);
      setShowContact((workerData as any).profiles?.show_contact ?? true);
      const profilePhone = (workerData as any).profiles?.phone || "";
      const stored = parseContactMethods((workerData as any).profiles?.contact_methods);
      if (stored.length > 0) {
        setContactMethods(stored.some((m) => m.type === "phone") ? stored : [{ type: "phone", value: profilePhone }, ...stored]);
      } else {
        const seed: ContactMethod[] = [{ type: "phone", value: profilePhone }];
        if ((workerData as any).profiles?.use_whatsapp && profilePhone) seed.push({ type: "whatsapp", value: profilePhone });
        setContactMethods(seed);
      }
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
    if (!workerData || !user) return;
    const trimmed: ContactMethod[] = normalizeContactMethods(contactMethods);
    const err = validateContactMethods(trimmed);
    if (err) { toast.error(err); return; }
    const phoneVal = trimmed.find((m) => m.type === "phone")?.value || "";
    if (!phoneVal) { toast.error("A phone number is required."); return; }
    const hasWhatsapp = trimmed.some((m) => m.type === "whatsapp" && m.value);

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

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ phone: phoneVal, use_whatsapp: hasWhatsapp, contact_methods: trimmed } as any)
      .eq("user_id", user.id);

    setSaving(false);
    if (workerError || profileError) {
      toast.error(profileError?.message || workerError?.message || "Failed to save changes");
    } else {
      setContactMethods(trimmed);
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
      <AppLayout title="Service Dashboard" subtitle="Create your service profile to start receiving local jobs." showSignOut>
        <div className="rounded-2xl border bg-card p-8 text-center">
          <p className="mb-4 text-muted-foreground">You don't have a service profile yet.</p>
          <Button onClick={() => navigate("/register?role=worker")}>Register as Service</Button>
        </div>
      </AppLayout>
    );
  }

  const workerName = (workerData as any).profiles?.full_name || "Service pro";
  const firstName = workerName.split(" ")[0];

  return (
    <AppLayout showSignOut>
      <section className="space-y-6">
        {/* Dark hero header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] bg-hero p-6 text-hero-foreground sm:p-8"
        >
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(hsl(var(--hero-foreground))_1px,transparent_1px)] [background-size:18px_18px]" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-primary/15 p-1 ring-1 ring-primary/30">
                <AvatarUpload currentUrl={(workerData as any).profiles?.avatar_url} onUpload={handleAvatarUpload} />
              </div>
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  <span className={`h-1.5 w-1.5 rounded-full ${available ? "animate-pulse bg-primary" : "bg-muted-foreground"}`} />
                  {available ? "Available now" : "Currently offline"}
                </span>
                <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">Hi, {firstName}</h1>
                <p className="text-sm text-hero-foreground/70">{profession || "Set your profession in profile"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs backdrop-blur-sm">
                <span className={`h-2 w-2 rounded-full ${available ? "bg-primary" : "bg-destructive"}`} />
                {available ? "Visible" : "Hidden"}
                <Switch checked={available} onCheckedChange={(v) => { setAvailable(v); supabase.from("workers").update({ available: v }).eq("id", workerData.id).then(() => queryClient.invalidateQueries({ queryKey: ["my_worker_profile"] })); }} className="ml-1" />
              </div>
              <RequestFeaturedDialog workerId={workerData.id} />
              <Button className="h-10 gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/discover")}>
                <Search className="h-4 w-4" /> Explore
              </Button>
            </div>
          </div>

          {/* Stats inside hero */}
          <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            {[
              { label: "Rating", value: avgRating, icon: Star, accent: true },
              { label: "Reviews", value: String(reviews.length), icon: UserCheck },
              { label: "New bookings", value: String(unreadByType.booking), icon: Calendar },
              { label: "New messages", value: String(unreadByType.message), icon: MessageSquare },
              { label: "Pending", value: String(pendingBookings.length), icon: Clock },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl p-3 ${s.accent ? "bg-primary text-primary-foreground" : "bg-white/10 backdrop-blur-sm"}`}>
                <div className="mb-1.5 flex items-center justify-between">
                  <s.icon className="h-3.5 w-3.5 opacity-80" />
                  <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{s.label}</span>
                </div>
                <p className="text-xl font-bold leading-none">{s.value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-3 md:grid-cols-3">
          <button onClick={() => navigate("/discover")} className="tap-feedback group rounded-3xl border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg">
            <div className="mb-3 inline-flex rounded-2xl p-2.5 group-hover:text-primary-foreground transition-colors bg-muted">
              <Compass className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="font-bold text-card-foreground">Find more demand</p>
            <p className="text-xs text-muted-foreground">See local categories and active jobs</p>
          </button>
          <button onClick={() => navigate("/blood-donors")} className="tap-feedback group rounded-3xl border bg-card p-5 text-left transition-all hover:border-destructive hover:shadow-lg">
            <div className="mb-3 inline-flex rounded-2xl bg-destructive/10 p-2.5">
              <HeartPulse className="h-5 w-5 text-destructive" />
            </div>
            <p className="font-bold text-card-foreground">Urgent network</p>
            <p className="text-xs text-muted-foreground">Help with blood and emergency requests</p>
          </button>
          <button onClick={() => navigate("/messages")} className="tap-feedback group rounded-3xl border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg">
            <div className="mb-3 inline-flex rounded-2xl p-2.5 transition-colors bg-muted">
              <MessageSquare className="h-5 w-5 text-secondary" />
            </div>
            <p className="font-bold text-card-foreground">Reply faster</p>
            <p className="text-xs text-muted-foreground">Keep your response time high</p>
          </button>
        </div>

        <div className="space-y-6">
          <DashboardNav
            items={[
              { value: "overview", label: "Overview", icon: LayoutDashboard },
              { value: "profile", label: "Profile", icon: UserCheck },
              { value: "bookings", label: "Bookings", icon: Calendar, badge: unreadByType.booking },
              { value: "messages", label: "Messages", icon: MessageSquare, badge: unreadByType.message + unreadByType.contact_request },
              { value: "reviews", label: "Reviews", icon: Star },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 space-y-5">
            <TabsList className="hidden">
              <TabsTrigger value="overview" />
              <TabsTrigger value="profile" />
              <TabsTrigger value="bookings" />
              <TabsTrigger value="messages" />
              <TabsTrigger value="reviews" />
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border bg-card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                      <h3 className="mt-2 font-bold text-card-foreground">Awaiting your reply ({pendingBookings.length})</h3>
                    </div>
                  </div>
                  {pendingBookings.length === 0 ? (
                    <div className="rounded-2xl bg-muted/40 p-6 text-center">
                      <p className="text-sm text-muted-foreground">No pending requests right now.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingBookings.slice(0, 3).map((b: any) => (
                        <div key={b.id} className="rounded-2xl bg-muted/40 p-3">
                          <p className="text-sm font-semibold text-card-foreground">{b.profiles?.full_name || "Client"}</p>
                          <p className="truncate text-xs text-muted-foreground">{b.service_description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-3xl border bg-card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                        <CheckCircle className="h-3 w-3" /> Confirmed
                      </span>
                      <h3 className="mt-2 font-bold text-card-foreground">Upcoming jobs ({confirmedBookings.length})</h3>
                    </div>
                  </div>
                  {confirmedBookings.length === 0 ? (
                    <div className="rounded-2xl bg-muted/40 p-6 text-center">
                      <p className="text-sm text-muted-foreground">No upcoming confirmed jobs.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {confirmedBookings.slice(0, 3).map((b: any) => (
                        <div key={b.id} className="rounded-2xl bg-muted/40 p-3">
                          <p className="text-sm font-semibold text-card-foreground">{b.profiles?.full_name || "Client"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(b.booking_date).toLocaleDateString()} · {b.booking_time}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profile">
              <div className="rounded-3xl border bg-card p-6 sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-card-foreground">Service profile</h2>
                    <p className="text-sm text-muted-foreground">How clients see you</p>
                  </div>
                  {workerData.verified && (
                    <Badge className="gap-1 rounded-full bg-success px-3 py-1 text-success-foreground">
                      <CheckCircle className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                </div>

                <div className="mb-6 flex items-center gap-4 rounded-2xl bg-muted/40 p-4">
                  <AvatarUpload currentUrl={(workerData as any).profiles?.avatar_url} onUpload={handleAvatarUpload} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-card-foreground">{(workerData as any).profiles?.full_name}</p>
                    <p className="truncate text-sm text-muted-foreground">{(workerData as any).profiles?.phone}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profession</Label>
                    <Input value={profession} onChange={(e) => setProfession(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Years of Experience</Label>
                    <Input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">About</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5 rounded-xl" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact options</Label>
                    <p className="mb-2 mt-1 text-xs text-muted-foreground">Phone is required. Add any other apps so clients can reach you.</p>
                    <ContactMethodsEditor value={contactMethods} onChange={setContactMethods} requirePhone />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4">
                  <div>
                    <p className="font-semibold text-foreground">Availability</p>
                    <p className="text-xs text-muted-foreground">{available ? "You are visible to clients" : "You are hidden from search"}</p>
                  </div>
                  <Switch checked={available} onCheckedChange={setAvailable} />
                </div>

                <Button onClick={handleSave} disabled={saving} className="mt-5 h-11 gap-2 rounded-xl px-6">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>

              <div className="rounded-3xl border bg-card p-6 sm:p-8">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <KeyRound className="h-4 w-4" /> Security
                </h3>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 p-4">
                  <div className="min-w-[200px]">
                    <p className="font-semibold text-card-foreground">Password</p>
                    <p className="text-xs text-muted-foreground">Change your account password regularly to stay secure.</p>
                  </div>
                  <ChangePasswordDialog>
                    <Button variant="outline" className="gap-2 rounded-xl h-10">
                      <KeyRound className="h-3.5 w-3.5" /> Change Password
                    </Button>
                  </ChangePasswordDialog>
                </div>
              </div>

              <div className="rounded-3xl border bg-card p-6 sm:p-8">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">Fixed service location</p>
                    <p className="text-xs text-muted-foreground">
                      {workerData.latitude && workerData.longitude
                        ? "Permanent and locked to your shop or work spot."
                        : "Set this once. It cannot be changed later."}
                    </p>
                  </div>
                  {workerData.latitude && workerData.longitude && (
                    <Badge variant="outline" className="gap-1 rounded-full">
                      <Lock className="h-3 w-3" /> Locked
                    </Badge>
                  )}
                </div>

                {workerData.latitude && workerData.longitude ? (
                  <>
                    <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {workerData.latitude.toFixed(5)}, {workerData.longitude.toFixed(5)}
                    </div>
                    <div className="overflow-hidden rounded-2xl">
                      <WorkersMap
                        workers={[{
                          id: workerData.id,
                          name: profession || "Your service location",
                          latitude: workerData.latitude,
                          longitude: workerData.longitude,
                        }]}
                        height="240px"
                      />
                    </div>
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-border bg-card/50 p-3">
                      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Need to change your fixed location?{" "}
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent("open-support-chat"))}
                          className="font-semibold text-primary underline-offset-2 hover:underline"
                        >
                          Contact us
                        </button>{" "}
                        and our team will help you update it.
                      </p>
                    </div>
                  </>
                ) : (
                  <Button variant="outline" onClick={handleSetFixedLocation} disabled={settingLocation} className="h-11 gap-2 rounded-xl">
                    <Navigation className="h-4 w-4" />
                    {settingLocation ? "Detecting..." : "Use current location"}
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4">
              {pendingBookings.length > 0 && (
                <div className="rounded-3xl border bg-card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-card-foreground">Pending requests</h3>
                    <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">{pendingBookings.length}</span>
                  </div>
                  <div className="space-y-3">
                    {pendingBookings.map((b: any) => (
                      <div key={b.id} className="rounded-2xl border border-warning/30 bg-gradient-to-br from-warning/5 to-transparent p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-card-foreground">{b.profiles?.full_name || "Client"}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{b.service_description}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground"><Calendar className="h-3 w-3" /> {new Date(b.booking_date).toLocaleDateString()}</span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground"><Clock className="h-3 w-3" /> {b.booking_time}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleBookingAction(b.id, "confirmed")} className="h-9 gap-1 rounded-xl">
                              <CheckCircle className="h-3.5 w-3.5" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBookingAction(b.id, "rejected")} className="h-9 gap-1 rounded-xl">
                              <XCircle className="h-3.5 w-3.5" /> Decline
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-3xl border bg-card p-6">
                <h3 className="mb-4 font-bold text-card-foreground">All bookings</h3>
                {bookings.length === 0 ? (
                  <div className="rounded-2xl bg-muted/40 p-10 text-center">
                    <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No bookings yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bookings.map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 p-4 transition-colors hover:bg-muted">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-card-foreground">{b.profiles?.full_name || "Client"}</p>
                          <p className="truncate text-sm text-muted-foreground">{b.service_description}</p>
                        </div>
                        <Badge className={`shrink-0 ${b.status === "confirmed" ? "bg-success text-success-foreground" : b.status === "rejected" ? "bg-destructive text-destructive-foreground" : "bg-muted-foreground/20 text-muted-foreground"}`}>{b.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="messages">
              <div className="rounded-3xl border bg-card p-6 sm:p-8">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-card-foreground">Messages</h2>
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-primary bg-secondary">{conversations.length}</span>
                </div>
                {conversations.length === 0 ? (
                  <div className="rounded-2xl bg-muted/40 p-10 text-center">
                    <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No conversations yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((c: any) => (
                      <Link key={c.userId} to={`/chat/${c.userId}`} className="flex items-center gap-4 rounded-2xl bg-muted/40 p-4 transition-all hover:bg-muted hover:translate-x-1">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground">
                          {c.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-card-foreground">{c.name}</p>
                          <p className="truncate text-sm text-muted-foreground">{c.lastMessage}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{new Date(c.time).toLocaleDateString()}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="rounded-3xl border bg-card p-6 sm:p-8">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-card-foreground">Client reviews</h2>
                    <p className="text-sm text-muted-foreground">{avgRating} average · {reviews.length} total</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="text-sm font-bold text-primary">{avgRating}</span>
                  </div>
                </div>
                {reviews.length === 0 ? (
                  <div className="rounded-2xl bg-muted/40 p-10 text-center">
                    <Star className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No reviews yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="rounded-2xl border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                              {(r.profiles?.full_name || "A").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <span className="font-semibold text-card-foreground">{r.profiles?.full_name || "Anonymous"}</span>
                          </div>
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
          </Tabs>
        </div>
      </section>
    </AppLayout>
  );
};

export default WorkerDashboard;
