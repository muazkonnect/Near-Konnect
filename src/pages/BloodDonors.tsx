import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Droplet, Search, MapPin, MessageSquare, Heart, ChevronDown, Users, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import BloodRequestDialog from "@/components/BloodRequestDialog";
import ActiveBloodRequests from "@/components/ActiveBloodRequests";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { calculateDistance } from "@/lib/geolocation";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import AppLayout from "@/components/AppLayout";
import DonorContactReveal from "@/components/DonorContactReveal";
import NearbyBloodRequestsForDonor from "@/components/NearbyBloodRequestsForDonor";
import { parseContactMethods } from "@/lib/contactMethods";
import { markRead } from "@/hooks/useNotifications";
import { useIsMobile } from "@/hooks/use-mobile";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const BloodDonors = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const { coords: userCoords } = useRealtimeLocation();
  const [tab, setTab] = useState<"requests" | "donors">("donors");
  const [expandedDonor, setExpandedDonor] = useState<string | null>(null);

  useEffect(() => {
    markRead((n) => n.type === "blood_request" || n.type === "booking");
  }, []);

  // Guests can view this page; contact/request actions prompt login.

  const { data: donors = [], isLoading } = useQuery({
    queryKey: ["blood_donors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url, city, blood_group, is_blood_donor, donor_status, contact_methods" as any)
        .eq("is_blood_donor", true)
        .order("full_name") as any;
      if (error) throw error;

      const userIds = (data as any[]).map((d: any) => d.user_id);
      const { data: workerData } = await supabase
        .from("workers")
        .select("user_id, latitude, longitude")
        .in("user_id", userIds);

      const workerMap = new Map<string, { lat: number; lng: number }>();
      workerData?.forEach((w) => {
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

  useEffect(() => {
    const channelName = `blood-donors-${Math.random().toString(36).slice(2)}`;
    const ch = supabase.channel(channelName);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
      queryClient.invalidateQueries({ queryKey: ["blood_donors"] });
    });
    ch.on("postgres_changes", { event: "*", schema: "public", table: "workers" }, () => {
      queryClient.invalidateQueries({ queryKey: ["blood_donors"] });
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  // Push viewer's live coords so other donors can see them in realtime
  useEffect(() => {
    if (!user || !userCoords) return;
    (supabase.rpc as any)("set_worker_location", {
      lat: userCoords.latitude,
      lng: userCoords.longitude,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["blood_donors"] });
    });
  }, [user, userCoords?.latitude, userCoords?.longitude, queryClient]);

  const { data: openRequestsCount = 0 } = useQuery({
    queryKey: ["blood_requests_open_count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("blood_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      return count || 0;
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    let list = donors.filter((d) => d.user_id !== user?.id);
    if (activeOnly) list = list.filter((d) => d.donor_status === "active");
    if (selectedGroup) list = list.filter((d) => d.blood_group === selectedGroup);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((d) =>
        (d.full_name || "").toLowerCase().includes(q) ||
        (d.city || "").toLowerCase().includes(q)
      );
    }
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
    active: donors.filter((d) => d.donor_status === "active").length,
  }), [donors]);

  if (authLoading) return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );

  if (!user) return null;

  // ============================== MOBILE LAYOUT ==============================
  if (isMobile) {
    return (
      <AppLayout
        title="Blood Donors"
        subtitle="Find verified donors near you. Requests are listed below."
        action={<BloodRequestDialog />}
      >
        {/* Stats card overlapping hero */}
        <section className="-mt-12 grid grid-cols-3 gap-2 rounded-3xl bg-card p-3 shadow-premium my-[8px] py-[12px]">
          <div className="rounded-2xl bg-destructive/10 p-3 text-center">
            <p className="text-xl font-extrabold text-destructive leading-none">{openRequestsCount}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Open</p>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-hero text-hero-foreground p-3 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
            <p className="relative text-xl font-extrabold text-primary leading-none">{stats.active}</p>
            <p className="relative mt-1 text-[10px] font-semibold uppercase tracking-wide text-hero-muted">Active</p>
          </div>
          <div className="rounded-2xl bg-muted p-3 text-center">
            <p className="text-xl font-extrabold text-foreground leading-none">{stats.total}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Donors</p>
          </div>
        </section>

        {/* Segmented tabs — Donors primary */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          <button
            onClick={() => setTab("donors")}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-all ${
              tab === "donors" ? "bg-hero text-hero-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Users className="h-4 w-4" /> Donors
          </button>
          <button
            onClick={() => setTab("requests")}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-all ${
              tab === "requests" ? "bg-destructive text-destructive-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Siren className="h-4 w-4" /> Requests
            {openRequestsCount > 0 && (
              <span className={`ml-0.5 rounded-full px-1.5 text-[10px] font-bold ${tab === "requests" ? "bg-white/20" : "bg-destructive text-destructive-foreground"}`}>
                {openRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className="mt-5">
          {tab === "requests" ? (
            <div>
              {openRequestsCount === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
                  <Siren className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No active requests</p>
                  <p className="mt-1 text-sm text-muted-foreground">When someone needs blood nearby, you'll see it here.</p>
                </div>
              ) : (
                <ActiveBloodRequests hideTitle />
              )}
            </div>
          ) : (
            <div>
              {/* Sticky search + filters */}
              <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 pt-1 pb-3 backdrop-blur">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or city"
                    className="h-11 rounded-full border-none bg-muted pl-10 text-sm"
                  />
                </div>

                {/* Horizontal scroll filter chips */}
                <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden">
                  <button
                    onClick={() => setActiveOnly(!activeOnly)}
                    className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                      activeOnly
                        ? "border-success/30 bg-success/15 text-success"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${activeOnly ? "bg-success" : "bg-muted-foreground"}`} />
                    Active only
                  </button>
                  <button
                    onClick={() => setSelectedGroup("")}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedGroup === "" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    All
                  </button>
                  {BLOOD_GROUPS.map((bg) => (
                    <button
                      key={bg}
                      onClick={() => setSelectedGroup(bg === selectedGroup ? "" : bg)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                        selectedGroup === bg
                          ? "border-destructive bg-destructive text-destructive-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-2 mb-3 text-xs font-medium text-muted-foreground">
                {filtered.length} donor{filtered.length !== 1 ? "s" : ""} nearby
              </p>

              {/* Minimal chip-style donor rows */}
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : filtered.length > 0 ? (
                <ul className="space-y-2">
                  {filtered.map((donor, i) => {
                    const distance = userCoords && donor.latitude && donor.longitude
                      ? calculateDistance(userCoords.latitude, userCoords.longitude, donor.latitude, donor.longitude).toFixed(1)
                      : null;
                    const isActive = donor.donor_status === "active";
                    const isOpen = expandedDonor === donor.user_id;

                    return (
                      <motion.li
                        key={donor.user_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.2) }}
                        className="overflow-hidden rounded-2xl border border-border/60 bg-card"
                      >
                        <button
                          onClick={() => setExpandedDonor(isOpen ? null : donor.user_id)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors active:bg-muted/50"
                        >
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-hero text-xs font-bold text-primary">
                              {donor.avatar_url ? (
                                <img src={donor.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                (donor.full_name || "?").slice(0, 2).toUpperCase()
                              )}
                            </div>
                            {isActive && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
                            )}
                          </div>

                          {/* Name + city */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-foreground leading-tight">
                              {donor.full_name || "Anonymous"}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                              {donor.city && (
                                <span className="inline-flex items-center gap-0.5 truncate">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{donor.city}</span>
                                </span>
                              )}
                              {distance && (
                                <span className="inline-flex shrink-0 items-center gap-0.5">
                                  <Heart className="h-2.5 w-2.5 text-destructive" />
                                  {distance} km
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Blood badge */}
                          <span className="flex h-9 min-w-[2.25rem] shrink-0 items-center justify-center rounded-lg bg-destructive/10 px-2 text-sm font-extrabold text-destructive ring-1 ring-destructive/20">
                            {donor.blood_group || "?"}
                          </span>

                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>

                        {/* Expanded actions */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-border/60 bg-muted/30"
                            >
                              <div className="space-y-2 p-3">
                                <Button
                                  size="sm"
                                  className="w-full gap-1.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/chat/${donor.user_id}`);
                                  }}
                                >
                                  <MessageSquare className="h-3.5 w-3.5" /> Message in-app
                                </Button>
                                {donor.contact_methods_parsed && (
                                  <DonorContactReveal
                                    donorUserId={donor.user_id}
                                    contactMethods={donor.contact_methods_parsed}
                                  />
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-3xl border border-dashed border-border bg-card py-12 text-center">
                  <Droplet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No donors found</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters</p>
                </div>
              )}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // ============================== DESKTOP LAYOUT (unchanged) ==============================
  return (
    <AppLayout
      title="Urgent Requests"
      subtitle="Respond to nearby blood donation requests quickly and safely."
      action={<BloodRequestDialog />}
    >
      <NearbyBloodRequestsForDonor />

      <section className="-mt-12 rounded-3xl bg-card p-5 shadow-premium">
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="relative overflow-hidden rounded-2xl bg-hero text-hero-foreground p-4">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
            <p className="relative text-3xl font-bold text-destructive text-center">{openRequestsCount}</p>
            <p className="relative text-xs text-hero-muted text-center">Open requests</p>
          </div>
          <div className="rounded-2xl bg-primary text-primary-foreground p-4">
            <p className="text-3xl font-bold text-center">Private</p>
            <p className="text-xs opacity-80 text-center">Donor identity protected</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or city..."
            className="pl-11 h-12 rounded-full border-none bg-muted"
          />
        </div>
      </section>

      <div className="py-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={selectedGroup === "" ? "default" : "outline"}
              className="cursor-pointer rounded-full px-3 py-1 text-sm"
              onClick={() => setSelectedGroup("")}
            >
              All Groups
            </Badge>
            {BLOOD_GROUPS.map((bg) => (
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

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
                  <span aria-hidden className="pointer-events-none absolute -right-3 -top-3 select-none text-[6rem] font-black leading-none text-destructive/[0.06] tracking-tighter">
                    {donor.blood_group || "?"}
                  </span>

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

                  <div className="relative my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                  <div className="relative">
                    <Button
                      size="sm"
                      className="w-full gap-1.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => navigate(`/chat/${donor.user_id}`)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Message in-app
                    </Button>

                    {donor.contact_methods_parsed && (
                      <div className="mt-1">
                        <DonorContactReveal
                          donorUserId={donor.user_id}
                          contactMethods={donor.contact_methods_parsed}
                        />
                      </div>
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
