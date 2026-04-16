import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Star, User, Search, Calendar, Clock, HeartPulse, Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AvatarUpload from "@/components/AvatarUpload";
import UpgradeToWorker from "@/components/UpgradeToWorker";
import BloodDonationCard from "@/components/BloodDonationCard";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { fetchConversationSummaries } from "@/lib/messages";

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
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setPhone(profile.phone || "");
      setCity(profile.city || "");
      setBloodGroup((profile as any).blood_group || "");
    }
  }, [profile]);


  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name, phone, city, blood_group: bloodGroup } as any).eq("user_id", user.id);
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
    <AppLayout
      title={`Welcome, ${firstName}`}
      subtitle="Your local help hub — bookings, chats, and urgent support in one place."
      action={
        <Button className="h-10 rounded-xl gap-2" onClick={() => navigate("/discover")}>
          <Search className="h-4 w-4" /> Find Services
        </Button>
      }
    >
      <section className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Messages", value: String(conversations.length), icon: MessageSquare },
            { label: "Bookings", value: String(myBookings.length), icon: Calendar },
            { label: "Reviews", value: String(myReviews.length), icon: Star },
            { label: "Profile", value: profile?.full_name ? "Ready" : "Setup", icon: User },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border bg-card p-4"
            >
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
            <p className="font-semibold text-card-foreground">Explore services</p>
            <p className="text-xs text-muted-foreground">Find trusted help nearby</p>
          </button>
          <button onClick={() => navigate("/blood-donors")} className="tap-feedback rounded-2xl border bg-card p-4 text-left">
            <HeartPulse className="mb-2 h-5 w-5 text-destructive" />
            <p className="font-semibold text-card-foreground">Urgent help</p>
            <p className="text-xs text-muted-foreground">Request blood and emergency support</p>
          </button>
          <button onClick={() => navigate("/messages")} className="tap-feedback rounded-2xl border bg-card p-4 text-left">
            <MessageSquare className="mb-2 h-5 w-5 text-secondary" />
            <p className="font-semibold text-card-foreground">Continue chats</p>
            <p className="text-xs text-muted-foreground">Talk with services instantly</p>
          </button>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-2xl bg-muted p-1 md:grid-cols-5">
            <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
            <TabsTrigger value="profile" className="rounded-xl">Profile</TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-xl">Bookings</TabsTrigger>
            <TabsTrigger value="messages" className="rounded-xl">Messages</TabsTrigger>
            <TabsTrigger value="blood" className="rounded-xl">Blood</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="rounded-2xl border bg-card p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Profile health</p>
                  <p className="text-lg font-semibold text-card-foreground">{profile?.full_name ? "You’re ready to hire" : "Complete your profile"}</p>
                </div>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Keep your city, phone and blood group updated for faster local matches.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-card p-5">
                <h3 className="mb-3 font-semibold text-card-foreground">Recent bookings</h3>
                {myBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings yet.</p>
                ) : (
                  <div className="space-y-2">
                    {myBookings.slice(0, 3).map((b: any) => (
                      <div key={b.id} className="rounded-xl bg-muted/50 p-3">
                        <p className="text-sm font-medium text-card-foreground">{b.workers?.profiles?.full_name || "Service"}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.service_description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border bg-card p-5">
                <h3 className="mb-3 font-semibold text-card-foreground">Recent chats</h3>
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                ) : (
                  <div className="space-y-2">
                    {conversations.slice(0, 3).map((c: any) => (
                      <Link key={c.userId} to={`/chat/${c.userId}`} className="block rounded-xl bg-muted/50 p-3 hover:bg-muted">
                        <p className="text-sm font-medium text-card-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="mb-4 font-semibold text-card-foreground">Edit Profile</h2>
              <div className="mb-6 flex items-start gap-4">
                <AvatarUpload currentUrl={profile?.avatar_url} onUpload={handleAvatarUpload} />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-card-foreground">{profile?.full_name || user?.email}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div><Label>Full Name</Label><Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5" /></div>
                <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1.5" /></div>
                <div><Label>City</Label><Input value={city} onChange={e => setCity(e.target.value)} className="mt-1.5" /></div>
                <div>
                  <Label>Blood Group</Label>
                  <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Select blood group</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
              </div>

              {role !== "worker" && (
                <div className="mt-6">
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
                <div className="rounded-2xl border bg-card p-10 text-center">
                  <Calendar className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No bookings yet. Find a service and book now!</p>
                </div>
              ) : (
                myBookings.map((b: any) => (
                  <div key={b.id} className="rounded-2xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-card-foreground">{b.workers?.profiles?.full_name || "Service"} · {b.workers?.profession}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{b.service_description}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(b.booking_date).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.booking_time}</span>
                        </div>
                      </div>
                      <Badge className={statusColor(b.status)}>{b.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="messages">
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="mb-4 font-semibold text-card-foreground">Recent Chats</h2>
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((c: any) => (
                    <Link key={c.userId} to={`/chat/${c.userId}`} className="flex items-center gap-4 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted">
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
        </Tabs>
      </section>
    </AppLayout>
  );
};

export default CustomerDashboard;
