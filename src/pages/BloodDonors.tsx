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
        .select("user_id, full_name, phone, avatar_url, city, blood_group, is_blood_donor, donor_status")
        .eq("is_blood_donor", true)
        .order("full_name");
      if (error) throw error;

      // Get worker location data for donors who are workers
      const userIds = data.map(d => d.user_id);
      const { data: workerData } = await supabase
        .from("workers")
        .select("user_id, latitude, longitude")
        .in("user_id", userIds);

      const workerMap = new Map<string, { lat: number; lng: number }>();
      workerData?.forEach(w => {
        if (w.latitude && w.longitude) workerMap.set(w.user_id, { lat: w.latitude, lng: w.longitude });
      });

      return data.map(d => ({
        ...d,
        latitude: workerMap.get(d.user_id)?.lat ?? null,
        longitude: workerMap.get(d.user_id)?.lng ?? null,
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
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-b from-destructive/5 to-background">
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-red-500/5 blur-3xl" />
        <div className="px-4 pb-6 pt-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-6 h-6 text-destructive" />
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">Blood Help Network</h1>
            </div>
            <p className="text-muted-foreground mb-6 max-w-lg">
              Find willing blood donors in your area. Every drop counts — connect with someone who can help save a life.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="flex gap-4 mb-6">
            <div className="bg-card border rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Donors</p>
            </div>
            <div className="bg-card border rounded-xl px-5 py-3 text-center">
              <p className="text-2xl font-bold text-success">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active Now</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or city..."
                className="pl-10 h-12 rounded-xl border-border bg-card shadow-sm"
              />
            </div>
          </div>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 rounded-2xl bg-card border animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((donor, i) => {
              const distance = userCoords && donor.latitude && donor.longitude
                ? calculateDistance(userCoords.latitude, userCoords.longitude, donor.latitude, donor.longitude).toFixed(1)
                : null;

              return (
                <motion.div
                  key={donor.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border rounded-2xl p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-600 shrink-0">
                      {donor.avatar_url ? (
                        <img src={donor.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        (donor.full_name || "?").slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-card-foreground truncate">{donor.full_name || "Anonymous"}</p>
                      {donor.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {donor.city}
                          {distance && <span className="ml-1">· {distance} km</span>}
                        </p>
                      )}
                    </div>
                    <Badge className={`text-xs font-bold border rounded-full px-2.5 py-1 ${bloodGroupColor(donor.blood_group || "")}`}>
                      {donor.blood_group || "?"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Badge variant="outline" className={`text-xs rounded-full ${donor.donor_status === "active" ? "border-green-300 text-green-600 bg-green-50" : "border-muted text-muted-foreground"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${donor.donor_status === "active" ? "bg-green-500" : "bg-muted-foreground"}`} />
                      {donor.donor_status === "active" ? "Available" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 rounded-xl"
                      onClick={() => navigate(`/chat/${donor.user_id}`)}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Help Now
                    </Button>
                    {donor.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 rounded-xl"
                        onClick={() => window.open(`tel:${donor.phone}`, "_self")}
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </Button>
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
