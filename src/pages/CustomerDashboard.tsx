import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Star, User, Search, Calendar, Clock, HeartPulse, Compass, Sparkles, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AvatarUpload from "@/components/AvatarUpload";
import UpgradeToWorker from "@/components/UpgradeToWorker";
import BloodDonationCard from "@/components/BloodDonationCard";
import AppLayout from "@/components/AppLayout";
import DashboardNav from "@/components/DashboardNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { fetchConversationSummaries } from "@/lib/messages";
import ContactMethodsEditor from "@/components/ContactMethodsEditor";
import { type ContactMethod, parseContactMethods, validateContactMethods, sanitizePhone } from "@/lib/contactMethods";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role } = useUserRole();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => fetchConversationSummaries(user!.id),
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ["customer_bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, workers!inner(id, profession, profiles:user_id(full_name))")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: myReviews = [] } = useQuery({
    queryKey: ["my_given_reviews", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").eq("customer_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Realtime for bookings
  useEffect(() => {
    if (!user) return;
    const channelName = `cust-bookings-${user.id}-${Math.random().toString(36).slice(2)}`;
    const ch = supabase.channel(channelName);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
      queryClient.invalidateQueries({ queryKey: ["customer_bookings"] });
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, queryClient]);

  const [name, setName] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([{ type: "phone", value: "" }]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setBloodGroup((profile as any).blood_group || "");
      const stored = parseContactMethods((profile as any).contact_methods);
      if (stored.length > 0) {
        setContactMethods(stored.some((m) => m.type === "phone") ? stored : [{ type: "phone", value: profile.phone || "" }, ...stored]);
      } else {
        // Backfill from legacy fields
        const seed: ContactMethod[] = [{ type: "phone", value: profile.phone || "" }];
        if ((profile as any).use_whatsapp && profile.phone) seed.push({ type: "whatsapp", value: profile.phone });
        setContactMethods(seed);
      }
    }
  }, [profile]);


  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const handleSave = async () => {
    if (!user) return;
    const trimmed: ContactMethod[] = contactMethods.map((m) =>
      m.type === "phone" ? { ...m, value: sanitizePhone(m.value) } : { ...m, value: m.value.trim() }
    );
    const phoneVal = trimmed.find((m) => m.type === "phone")?.value || "";
    if (!phoneVal) {
      toast.error("A phone number is required.");
      return;
    }
    const err = validateContactMethods(trimmed);
    if (err) { toast.error(err); return; }
    const hasWhatsapp = trimmed.some((m) => m.type === "whatsapp" && m.value);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: name,
      phone: phoneVal,
      blood_group: bloodGroup,
      use_whatsapp: hasWhatsapp,
      contact_methods: trimmed,
    } as any).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Failed to save");
    else { toast.success("Profile updated!"); queryClient.invalidateQueries({ queryKey: ["my_profile"] }); }
  };

  const handleAvatarUpload = async (url: string) => {
    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user!.id);
    queryClient.invalidateQueries({ queryKey: ["my_profile"] });
  };

  const statusColor = (status: string) => {
    if (status === "confirmed") return "bg-success text-success-foreground";
    if (status === "completed") return "bg-primary text-primary-foreground";
    if (status === "rejected") return "bg-destructive text-destructive-foreground";
    return "bg-warning text-warning-foreground";
  };

  const firstName = profile?.full_name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || "there";

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AppLayout>
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
                <AvatarUpload currentUrl={profile?.avatar_url} onUpload={handleAvatarUpload} />
              </div>
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Your local hub
                </span>
                <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">Welcome, {firstName}</h1>
                <p className="text-sm text-hero-foreground/70">Bookings, chats & urgent help — all in one place.</p>
              </div>
            </div>

            <Button className="h-10 gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/discover")}>
              <Search className="h-4 w-4" /> Find services
            </Button>
          </div>

          {/* Stats inside hero */}
          <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              { label: "Messages", value: String(conversations.length), icon: MessageSquare, accent: true },
              { label: "Bookings", value: String(myBookings.length), icon: Calendar },
              { label: "Reviews", value: String(myReviews.length), icon: Star },
              { label: "Profile", value: profile?.full_name ? "Ready" : "Setup", icon: User },
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
            <div className="mb-3 inline-flex rounded-2xl bg-primary/10 p-2.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Compass className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
            </div>
            <p className="font-bold text-card-foreground">Explore services</p>
            <p className="text-xs text-muted-foreground">Find trusted help nearby</p>
          </button>
          <button onClick={() => navigate("/blood-donors")} className="tap-feedback group rounded-3xl border bg-card p-5 text-left transition-all hover:border-destructive hover:shadow-lg">
            <div className="mb-3 inline-flex rounded-2xl bg-destructive/10 p-2.5">
              <HeartPulse className="h-5 w-5 text-destructive" />
            </div>
            <p className="font-bold text-card-foreground">Urgent help</p>
            <p className="text-xs text-muted-foreground">Blood and emergency support</p>
          </button>
          <button onClick={() => navigate("/messages")} className="tap-feedback group rounded-3xl border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg">
            <div className="mb-3 inline-flex rounded-2xl bg-muted p-2.5 group-hover:bg-primary/10 transition-colors">
              <MessageSquare className="h-5 w-5 text-foreground group-hover:text-primary" />
            </div>
            <p className="font-bold text-card-foreground">Continue chats</p>
            <p className="text-xs text-muted-foreground">Talk with services instantly</p>
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <DashboardNav
            items={[
              { value: "overview", label: "Overview", icon: LayoutDashboard },
              { value: "profile", label: "Profile", icon: User },
              { value: "bookings", label: "Bookings", icon: Calendar, badge: myBookings.length },
              { value: "messages", label: "Messages", icon: MessageSquare, badge: conversations.length },
              { value: "blood", label: "Blood", icon: HeartPulse },
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
              <TabsTrigger value="blood" />
            </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="rounded-3xl border bg-gradient-to-br from-card to-muted/30 p-6">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                    <Sparkles className="h-3 w-3" /> Profile health
                  </span>
                  <p className="mt-2 text-xl font-bold text-card-foreground">{profile?.full_name ? "You're ready to hire" : "Complete your profile"}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Keep your phone and blood group updated for faster local matches.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-card-foreground">Recent bookings</h3>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                {myBookings.length === 0 ? (
                  <div className="rounded-2xl bg-muted/40 p-6 text-center">
                    <p className="text-sm text-muted-foreground">No bookings yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myBookings.slice(0, 3).map((b: any) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 p-3 transition-colors hover:bg-muted">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-card-foreground">{b.workers?.profiles?.full_name || "Service"}</p>
                          <p className="truncate text-xs text-muted-foreground">{b.service_description}</p>
                        </div>
                        <Badge className={`shrink-0 ${statusColor(b.status)}`}>{b.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-card-foreground">Recent chats</h3>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                {conversations.length === 0 ? (
                  <div className="rounded-2xl bg-muted/40 p-6 text-center">
                    <p className="text-sm text-muted-foreground">No conversations yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.slice(0, 3).map((c: any) => (
                      <Link key={c.userId} to={`/chat/${c.userId}`} className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3 transition-colors hover:bg-muted">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {c.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-card-foreground">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
                        </div>
                      </Link>
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
                  <h2 className="text-xl font-bold text-card-foreground">Edit Profile</h2>
                  <p className="text-sm text-muted-foreground">Update your personal details</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                  <User className="h-3 w-3" /> Personal info
                </span>
              </div>

              <div className="mb-6 flex items-center gap-4 rounded-2xl bg-muted/40 p-4">
                <AvatarUpload currentUrl={profile?.avatar_url} onUpload={handleAvatarUpload} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-card-foreground">{profile?.full_name || user?.email}</p>
                  <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5 h-11 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blood Group</Label>
                  <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Select blood group</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact options</Label>
                  <p className="mb-2 mt-1 text-xs text-muted-foreground">Phone is required. Add any other apps so people can reach you.</p>
                  <ContactMethodsEditor value={contactMethods} onChange={setContactMethods} requirePhone />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="mt-6 h-11 rounded-xl px-6">
                {saving ? "Saving..." : "Save Changes"}
              </Button>

              {role !== "worker" && (
                <div className="mt-8 border-t pt-6">
                  <UpgradeToWorker />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="blood">
            <BloodDonationCard />
          </TabsContent>

          <TabsContent value="bookings">
            <div className="space-y-3">
              {myBookings.length === 0 ? (
                <div className="rounded-3xl border bg-card p-12 text-center">
                  <div className="mx-auto mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-semibold text-card-foreground">No bookings yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Find a service and book your first one!</p>
                  <Button onClick={() => navigate("/discover")} className="mt-4 h-10 rounded-xl">Explore services</Button>
                </div>
              ) : (
                myBookings.map((b: any) => (
                  <div key={b.id} className="group rounded-2xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-card-foreground">{b.workers?.profiles?.full_name || "Service"}</p>
                        <p className="text-xs font-medium text-primary">{b.workers?.profession}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{b.service_description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground"><Calendar className="h-3 w-3" /> {new Date(b.booking_date).toLocaleDateString()}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground"><Clock className="h-3 w-3" /> {b.booking_time}</span>
                        </div>
                      </div>
                      <Badge className={`shrink-0 ${statusColor(b.status)}`}>{b.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="messages">
            <div className="rounded-3xl border bg-card p-6 sm:p-8">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-card-foreground">Recent Chats</h2>
                <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">{conversations.length}</span>
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
          </Tabs>
        </div>
      </section>
    </AppLayout>
  );
};

export default CustomerDashboard;
