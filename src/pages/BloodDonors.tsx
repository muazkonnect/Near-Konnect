import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Droplet, Search, MapPin, Phone, MessageSquare, Filter, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BloodRequestDialog from "@/components/BloodRequestDialog";
import ActiveBloodRequests from "@/components/ActiveBloodRequests";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentPosition, calculateDistance, type Coords } from "@/lib/geolocation";
import AppLayout from "@/components/AppLayout";
import ContactMethodsBar from "@/components/ContactMethodsBar";
import { parseContactMethods } from "@/lib/contactMethods";
import { markRead } from "@/hooks/useNotifications";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const bloodGroupColor = (bg: string) => {
  if (bg.startsWith("O")) return "bg-red-500/15 text-red-600 border-red-200";
  if (bg.startsWith("A") && !bg.startsWith("AB")) return "bg-orange-500/15 text-orange-600 border-orange-200";
  if (bg.startsWith("B")) return "bg-rose-500/15 text-rose-600 border-rose-200";
  return "bg-pink-500/15 text-pink-600 border-pink-200";
};

const BloodDonors = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  useEffect(() => {
    markRead((n) => n.type === "blood_request" || n.type === "booking");
  }, []);
  const [activeOnly, setActiveOnly] = useState(true);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    getCurrentPosition()
      .then(setUserCoords)
      .catch(() => setUserCoords(null));
  }, []);

  const { data: donors = [], isLoading } = useQuery({
    queryKey: ["blood_donors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url, city, blood_group, is_blood_donor, donor_status, contact_methods" as any)
        .eq("is_blood_donor", true)
        .order("full_name") as any;
      if (error) throw error;

      // Get worker location data for donors who are workers
      const userIds = (data as any[]).map((d: any) => d.user_id);
      const { data: workerData } = await supabase
        .from("workers")
        .select("user_id, latitude, longitude")
        .in("user_id", userIds);

      const workerMap = new Map<string, { lat: number; lng: number }>();
      workerData?.forEach(w => {
        if (w.latitude && w.longitude) workerMap.set(w.user_id, { lat: w.latitude, lng: w.longitude });
      });

      return (data as any[]).map((d: any) => ({
        ...d,
        latitude: workerMap.get(d.user_id)?.lat ?? null,
        longitude: workerMap.get(d.user_id)?.lng ?? null,
        contact_methods_parsed: parseContactMethods(d.contact_methods),
      }));
    },
    enabled: !!user,
  });

  // Realtime subscription for profile changes
  useEffect(() => {
    const channelName = `blood-donors-${Math.random().toString(36).slice(2)}`;
    const ch = supabase.channel(channelName);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
      queryClient.invalidateQueries({ queryKey: ["blood_donors"] });
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const filtered = useMemo(() => {
    let list = donors.filter(d => d.user_id !== user?.id);
    if (activeOnly) list = list.filter(d => d.donor_status === "active");
    if (selectedGroup) list = list.filter(d => d.blood_group === selectedGroup);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(d =>
        (d.full_name || "").toLowerCase().includes(q) ||
        (d.city || "").toLowerCase().includes(q)
      );
    }
    // Sort by distance if location available
    if (userCoords) {
      list = [...list].sort((a, b) => {
        const distA = a.latitude && a.longitude ? calculateDistance(userCoords.latitude, userCoords.longitude, a.latitude, a.longitude) : 9999;
        const distB = b.latitude && b.longitude ? calculateDistance(userCoords.latitude, userCoords.longitude, b.latitude, b.longitude) : 9999;
        return distA - distB;
      });
    }
    return list;
  }, [donors, search, selectedGroup, activeOnly, user?.id, userCoords]);

  const stats = useMemo(() => ({
    total: donors.length,
    active: donors.filter(d => d.donor_status === "active").length,
  }), [donors]);

  if (authLoading) return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <AppLayout
      title="Urgent Requests"
      subtitle="Respond to nearby blood donation requests quickly and safely."
      action={<BloodRequestDialog />}
    >
      <section className="-mt-12 rounded-3xl bg-card p-5 shadow-premium">
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-2xl bg-hero text-hero-foreground p-4">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-hero-muted">Total Donors</p>
          </div>
          <div className="rounded-2xl bg-primary text-primary-foreground p-4">
            <p className="text-3xl font-bold">{stats.active}</p>
            <p className="text-xs opacity-80">Active Now</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or city..."
            className="pl-11 h-12 rounded-full border-none bg-muted"
          />
        </div>
      </section>

      <div className="py-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters:</span>
          </div>

          {/* Blood group filter */}
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={selectedGroup === "" ? "default" : "outline"}
              className="cursor-pointer rounded-full px-3 py-1 text-sm"
              onClick={() => setSelectedGroup("")}
            >
              All Groups
            </Badge>
            {BLOOD_GROUPS.map(bg => (
              <Badge
                key={bg}
                variant={selectedGroup === bg ? "default" : "outline"}
                className="cursor-pointer rounded-full px-3 py-1 text-sm"
                onClick={() => setSelectedGroup(bg === selectedGroup ? "" : bg)}
              >
                {bg}
              </Badge>
            ))}
          </div>

          {/* Active only toggle */}
          <Button
            variant={activeOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveOnly(!activeOnly)}
            className="rounded-full"
          >
            <Droplet className="w-3 h-3 mr-1" />
            Active Only
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} donor{filtered.length !== 1 ? "s" : ""} found</p>

        {/* Donor cards */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-56 rounded-3xl bg-card border animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((donor, i) => {
              const distance = userCoords && donor.latitude && donor.longitude
                ? calculateDistance(userCoords.latitude, userCoords.longitude, donor.latitude, donor.longitude).toFixed(1)
                : null;
              const isActive = donor.donor_status === "active";

              return (
                <motion.div
                  key={donor.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-5 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.08)] transition-all hover:-translate-y-0.5 hover:border-destructive/30 hover:shadow-premium"
                >
                  {/* Decorative blood-group watermark */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-3 -top-3 select-none text-[6rem] font-black leading-none text-destructive/[0.06] tracking-tighter"
                  >
                    {donor.blood_group || "?"}
                  </span>

                  {/* Top: avatar + name + blood badge */}
                  <div className="relative flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div className="h-14 w-14 overflow-hidden rounded-2xl bg-hero flex items-center justify-center text-base font-bold text-primary ring-2 ring-background">
                        {donor.avatar_url ? (
                          <img src={donor.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (donor.full_name || "?").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      {isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background">
                          <span className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-bold text-card-foreground truncate leading-tight">{donor.full_name || "Anonymous"}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-success" : "bg-muted-foreground"}`} />
                          {isActive ? "Available" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
                      <span className="text-base font-extrabold text-destructive leading-none">{donor.blood_group || "?"}</span>
                    </div>
                  </div>

                  {/* Meta row: city + distance */}
                  {(donor.city || distance) && (
                    <div className="relative mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      {donor.city && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{donor.city}</span>
                        </span>
                      )}
                      {distance && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                          <Heart className="h-3 w-3 text-destructive" />
                          {distance} km
                        </span>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  <div className="relative my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  {/* Primary in-app message CTA */}
                  <div className="relative">
                    <Button
                      size="sm"
                      className="w-full gap-1.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => navigate(`/chat/${donor.user_id}`)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Message in-app
                    </Button>

                    {/* Contact channels */}
                    {donor.contact_methods_parsed && donor.contact_methods_parsed.length > 0 && (
                      <>
                        <div className="mt-3 mb-2 flex items-center gap-2">
                          <span className="h-px flex-1 bg-border" />
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Reach out via</span>
                          <span className="h-px flex-1 bg-border" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <ContactMethodsBar
                            methods={donor.contact_methods_parsed}
                            variant="card"
                            className="!gap-1.5 [&>a]:!h-9 [&>a]:!w-9 [&>a>svg]:!h-4 [&>a>svg]:!w-4"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Droplet className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="font-medium text-muted-foreground">No donors found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
          </div>
        )}
      </div>

      <ActiveBloodRequests />
    </AppLayout>
  );
};

export default BloodDonors;
