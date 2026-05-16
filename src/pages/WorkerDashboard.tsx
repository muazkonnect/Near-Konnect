import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  Clock,
  Compass,
  Sparkles,
  Eye,
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
import AvatarResetFlow from "@/components/AvatarResetFlow";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import RequestFeaturedDialog from "@/components/RequestFeaturedDialog";

import StarRating from "@/components/StarRating";
import AppLayout from "@/components/AppLayout";
import logoImg from "@/assets/logo.svg";
import DashboardNav from "@/components/DashboardNav";

import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useWorkerProfile } from "@/hooks/useWorkerProfile";
import { getCurrentPosition } from "@/lib/geolocation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchConversationSummaries } from "@/lib/messages";
import { useNotifications, markRead } from "@/hooks/useNotifications";
import ContactMethodsEditor from "@/components/ContactMethodsEditor";
import { type ContactMethod, parseContactMethods, validateContactMethods, sanitizePhone, normalizeContactMethods } from "@/lib/contactMethods";
import { useCategories } from "@/hooks/useCategories";

const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { roles, isLoading: roleLoading } = useUserRole();
  const { mainCategories, getSubCategories } = useCategories();

  // Admins are not workers — bounce them to the admin dashboard.
  useEffect(() => {
    if (!authLoading && !roleLoading && roles.includes("admin")) {
      navigate("/admin", { replace: true });
    }
  }, [authLoading, roleLoading, roles, navigate]);
  const { data: workerData, isLoading } = useWorkerProfile();
  const queryClient = useQueryClient();

  const [profession, setProfession] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [experience, setExperience] = useState("");
  const [description, setDescription] = useState("");
  const [available, setAvailable] = useState(true);
  const [showContact, setShowContact] = useState(true);
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([{ type: "phone", value: "" }]);
  const [saving, setSaving] = useState(false);
  const [settingLocation, setSettingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { unreadByType } = useNotifications();

  const subCategories = mainCategory ? getSubCategories(mainCategory) : [];

  useEffect(() => {
    if (activeTab === "messages") markRead((n) => n.type === "message");
    if (activeTab === "bookings") markRead((n) => n.type === "booking");
  }, [activeTab]);

  useEffect(() => {
    if (workerData) {
      setProfession(workerData.profession || "");
      setMainCategory(workerData.main_category || "");
      setSubCategory(workerData.sub_category || "");
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
        profession: subCategory || profession, // Use subCategory as profession if available
        main_category: mainCategory,
        sub_category: subCategory,
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
    <AppLayout showSignOut hideMobileHeader>
      <section className="-mx-4 -mt-[90px] -mb-[166px] min-h-screen bg-hero px-4 pb-40 pt-4 text-hero-foreground">
        {/* Top App Bar */}
        <header className="sticky top-0 z-40 -mx-4 mb-5 flex items-center justify-between gap-3 border-b border-hero-foreground/10 bg-hero/90 px-5 py-3 backdrop-blur-md">
          <Link to="/" className="inline-flex items-center">
            <img src={logoImg} alt="Near Konnect" className="h-8 object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-full border border-hero-foreground/15 bg-hero-foreground/5 px-3 py-1.5">
              <span className={`h-2 w-2 rounded-full ${available ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]" : "bg-hero-foreground/30"}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider">{available ? "Online" : "Offline"}</span>
              <Switch
                checked={available}
                onCheckedChange={(v) => {
                  setAvailable(v);
                  supabase.from("workers").update({ available: v }).eq("id", workerData.id).then(() => queryClient.invalidateQueries({ queryKey: ["my_worker_profile"] }));
                }}
              />
            </label>
            <button
              onClick={() => navigate("/messages")}
              className="relative rounded-full p-2 text-primary transition hover:bg-hero-foreground/10"
              aria-label="Notifications"
            >
              <MessageSquare className="h-5 w-5" />
              {(unreadByType.message + unreadByType.booking) > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
              )}
            </button>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-2xl space-y-4"
        >
          {/* Profile Summary */}
          <div className="rounded-xl border border-hero-foreground/10 bg-hero-foreground/5 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-bold sm:text-2xl">{workerName}</span>
                  {workerData.verified && (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Pro Verified
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-hero-foreground/70">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" /> {avgRating} Rating
                  </span>
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" /> {reviews.length} Reviews
                  </span>
                  <span className={`flex items-center gap-1.5 ${available ? "text-primary" : "text-hero-foreground/50"}`}>
                    <span className={`h-2 w-2 rounded-full ${available ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]" : "bg-hero-foreground/30"}`} />
                    {available ? "Available Now" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Profile", icon: UserCheck, onClick: () => setActiveTab("profile") },
              { label: "Manage Services", icon: UserCheck, onClick: () => setActiveTab("profile") },
              { label: "Boost Ad", icon: Sparkles, onClick: () => navigate("/discover") },
              { label: "Get Support", icon: MessageSquare, onClick: () => window.dispatchEvent(new CustomEvent("open-support-chat")) },
            ].map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-hero-foreground/10 bg-hero-foreground/5 p-4 text-center transition hover:border-primary/30 hover:bg-hero-foreground/10"
              >
                <a.icon className="h-5 w-5 text-hero-foreground/70 transition group-hover:text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-hero-foreground/70">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Sparks Wallet */}
          <div className="relative overflow-hidden rounded-xl bg-primary p-5 text-primary-foreground shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.4)]">
            <Sparkles className="pointer-events-none absolute -right-4 -top-4 h-40 w-40 text-primary-foreground/5" strokeWidth={1} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest opacity-80">Sparks Wallet</h2>
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold leading-none">2,450</p>
                <p className="mt-1 text-sm opacity-80">Available Credits</p>
              </div>
            </div>
            <div className="relative mt-6 space-y-2">
              <button className="w-full rounded-xl bg-primary-foreground py-3 text-sm font-bold text-primary transition hover:opacity-90">
                Top Up Balance
              </button>
              <p className="text-center text-[11px] font-semibold opacity-70">Next auto-recharge in 4 days</p>
            </div>
          </div>

          {/* Active Requests */}
          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold">Active Requests</h2>
                <p className="text-sm text-hero-foreground/60">High-priority hyperlocal service leads near you.</p>
              </div>
              <button
                onClick={() => setActiveTab("bookings")}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View All →
              </button>
            </div>

            {pendingBookings.length === 0 ? (
              <div className="rounded-xl border border-hero-foreground/10 bg-hero-foreground/5 p-8 text-center text-sm text-hero-foreground/60">
                No active requests right now.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingBookings.slice(0, 4).map((b: any) => {
                  const ageMs = Date.now() - new Date(b.created_at).getTime();
                  const ageMin = Math.floor(ageMs / 60000);
                  const ageLabel = ageMin < 60 ? `${ageMin}m ago` : ageMin < 1440 ? `${Math.floor(ageMin / 60)}h ago` : `${Math.floor(ageMin / 1440)}d ago`;
                  const urgent = ageMin < 15;
                  return (
                    <div
                      key={b.id}
                      className="group flex flex-col gap-3 rounded-xl border border-hero-foreground/10 bg-hero-foreground/5 p-4 transition hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-hero-foreground/15 bg-hero-foreground/5 text-primary">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold">{b.profiles?.full_name || "Client"}</h3>
                            {urgent && (
                              <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive">
                                Urgent
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-1 text-xs text-hero-foreground/60">{b.service_description}</p>
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-hero-foreground/60">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {new Date(b.booking_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {ageLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => handleBookingAction(b.id, "rejected")}
                          className="rounded-lg border border-hero-foreground/15 bg-hero-foreground/5 px-3 py-2 text-xs font-semibold text-hero-foreground/80 transition hover:bg-hero-foreground/10"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleBookingAction(b.id, "confirmed")}
                          className="rounded-lg bg-hero-foreground px-4 py-2 text-xs font-bold text-hero transition group-hover:bg-primary group-hover:text-primary-foreground"
                        >
                          Accept Job
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </motion.div>

        <div className="mx-auto mt-8 max-w-2xl space-y-6">
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
                <div className="rounded-3xl border border-hero-foreground/10 bg-hero-foreground/5 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                      <h3 className="mt-2 font-bold text-hero-foreground">Awaiting your reply ({pendingBookings.length})</h3>
                    </div>
                  </div>
                  {pendingBookings.length === 0 ? (
                    <div className="rounded-2xl bg-hero-foreground/5 p-6 text-center">
                      <p className="text-sm text-hero-foreground/60">No pending requests right now.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingBookings.slice(0, 3).map((b: any) => (
                        <div key={b.id} className="rounded-2xl bg-hero-foreground/5 p-3">
                          <p className="text-sm font-semibold text-hero-foreground">{b.profiles?.full_name || "Client"}</p>
                          <p className="truncate text-xs text-hero-foreground/60">{b.service_description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-3xl border border-hero-foreground/10 bg-hero-foreground/5 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                        <CheckCircle className="h-3 w-3" /> Confirmed
                      </span>
                      <h3 className="mt-2 font-bold text-hero-foreground">Upcoming jobs ({confirmedBookings.length})</h3>
                    </div>
                  </div>
                  {confirmedBookings.length === 0 ? (
                    <div className="rounded-2xl bg-hero-foreground/5 p-6 text-center">
                      <p className="text-sm text-hero-foreground/60">No upcoming confirmed jobs.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {confirmedBookings.slice(0, 3).map((b: any) => (
                        <div key={b.id} className="rounded-2xl bg-hero-foreground/5 p-3">
                          <p className="text-sm font-semibold text-hero-foreground">{b.profiles?.full_name || "Client"}</p>
                          <p className="text-xs text-hero-foreground/60">{new Date(b.booking_date).toLocaleDateString()} · {b.booking_time}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profile">
              <div className="space-y-3 rounded-2xl border border-hero-foreground/10 bg-hero-foreground/5 p-3">
                {/* Header row: avatar + name + verified */}
                <div className="flex items-center gap-3">
                  <AvatarUpload currentUrl={(workerData as any).profiles?.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-hero-foreground">{(workerData as any).profiles?.full_name}</p>
                      {workerData.verified && (
                        <Badge className="h-5 gap-1 rounded-full bg-success px-1.5 text-[9px] text-success-foreground">
                          <CheckCircle className="h-2.5 w-2.5" /> Verified
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-hero-foreground/60">{(workerData as any).profiles?.phone}</p>
                    <AvatarResetFlow onReplaced={() => queryClient.invalidateQueries({ queryKey: ["my_worker_profile"] })} />
                  </div>
                </div>

                {/* Compact field grid */}
                {(() => {
                  const fieldCls = "h-9 w-full rounded-lg border border-hero-foreground/15 bg-hero-foreground/5 px-2.5 text-xs text-hero-foreground placeholder:text-hero-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
                  const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-hero-foreground/50";
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-1">
                        <label className={labelCls}>Category</label>
                        <select value={mainCategory} onChange={(e) => { setMainCategory(e.target.value); setSubCategory(""); }} className={`mt-0.5 ${fieldCls}`}>
                          <option value="">Select</option>
                          {mainCategories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className={labelCls}>Subcategory</label>
                        <select value={subCategory} onChange={(e) => { setSubCategory(e.target.value); setProfession(e.target.value); }} disabled={!mainCategory} className={`mt-0.5 ${fieldCls} disabled:opacity-50`}>
                          <option value="">Select</option>
                          {subCategories.map((sub) => <option key={sub.id} value={sub.name}>{sub.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Display name</label>
                        <input value={profession} onChange={(e) => setProfession(e.target.value)} className={`mt-0.5 ${fieldCls}`} />
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls}>Years of experience</label>
                        <input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} className={`mt-0.5 ${fieldCls}`} />
                      </div>
                    </div>
                  );
                })()}

                {/* Contact options */}
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-hero-foreground/50">Contact apps</p>
                  <ContactMethodsEditor value={contactMethods} onChange={setContactMethods} requirePhone variant="hero" />
                </div>

                {/* Quick actions row */}
                <div className="flex flex-wrap items-center gap-1.5 border-t border-hero-foreground/10 pt-3">
                  <Button onClick={handleSave} disabled={saving} className="h-9 gap-1.5 rounded-lg px-4 text-xs">
                    <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
                  </Button>
                  <ChangePasswordDialog>
                    <Button type="button" variant="outline" className="h-9 gap-1 rounded-lg border-hero-foreground/15 bg-transparent px-3 text-xs text-hero-foreground hover:bg-hero-foreground/10">
                      <KeyRound className="h-3 w-3" /> Password
                    </Button>
                  </ChangePasswordDialog>
                  {workerData.latitude && workerData.longitude ? (
                    <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-hero-foreground/15 bg-hero-foreground/5 px-2.5 text-[10px] text-hero-foreground/70">
                      <Lock className="h-3 w-3" />
                      <MapPin className="h-3 w-3" />
                      {workerData.latitude.toFixed(3)},{workerData.longitude.toFixed(3)}
                      <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("open-support-chat"))} className="ml-1 font-semibold text-primary hover:underline">
                        Change
                      </button>
                    </span>
                  ) : (
                    <Button type="button" variant="outline" onClick={handleSetFixedLocation} disabled={settingLocation} className="h-9 gap-1 rounded-lg border-hero-foreground/15 bg-transparent px-3 text-xs text-hero-foreground hover:bg-hero-foreground/10">
                      <Navigation className="h-3 w-3" />
                      {settingLocation ? "Detecting..." : "Set location"}
                    </Button>
                  )}
                </div>
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
