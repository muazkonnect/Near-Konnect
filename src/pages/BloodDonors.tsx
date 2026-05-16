import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Droplet, Search, MapPin, Heart, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BloodRequestDialog from "@/components/BloodRequestDialog";
import ActiveBloodRequests from "@/components/ActiveBloodRequests";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { calculateDistance } from "@/lib/geolocation";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import AppLayout from "@/components/AppLayout";
import { parseContactMethods } from "@/lib/contactMethods";
import { markRead } from "@/hooks/useNotifications";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const BloodDonors = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const { coords: userCoords } = useRealtimeLocation();

  useEffect(() => {
    if (user) markRead((n) => n.type === "blood_request" || n.type === "booking");
  }, [user]);

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
  });

  const filtered = useMemo(() => {
    let list = donors.filter((d) => d.user_id !== user?.id);
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
  }, [donors, search, selectedGroup, user?.id, userCoords]);

  return (
    <AppLayout hideMobileHeader>
      <div className="-mx-4 -mt-[90px] -mb-[166px] min-h-screen bg-white text-[#271716]">
        {/* TOP APP BAR */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#ffe2de] bg-white/90 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#271716]">menu</span>
            <h1 className="text-xl font-semibold tracking-tight">Near Konnect</h1>
          </div>
          <span className="material-symbols-outlined text-[#271716]">notifications</span>
        </header>

        <main className="px-6 pt-6 pb-8">
          {/* HERO CARD */}
          <section className="relative mb-8 overflow-hidden rounded-xl border border-[#ffe2de] bg-white p-4 shadow-sm">
            <div aria-hidden className="pointer-events-none absolute -right-2 -top-2">
              <Heart className="h-32 w-32 fill-[#b7131a] text-[#b7131a] opacity-[0.08] animate-[heart-pulse_1.5s_ease-in-out_infinite]" />
            </div>
            <div className="relative">
              <div className="mb-2 flex items-center gap-2">
                <Heart className="h-4 w-4 fill-[#b7131a] text-[#b7131a] animate-[heart-pulse_1.5s_ease-in-out_infinite]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b7131a]">Life Support</span>
              </div>
              <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight">Blood Konnect</h2>
              <div className="flex max-w-2xl flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#906f6c]" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by donor name or location..."
                    className="h-12 w-full rounded-lg border border-[#e4beb9] bg-[#fff0ee] pl-12 pr-4 text-[#271716] placeholder:text-[#906f6c] focus-visible:ring-1 focus-visible:ring-[#b7131a]"
                  />
                </div>
                <Button className="h-12 gap-2 rounded-lg bg-[#b7131a] text-sm font-semibold uppercase tracking-wider text-white shadow-md shadow-[#b7131a]/20 hover:bg-[#b7131a]/90">
                  <Search className="h-4 w-4" /> Find Donors
                </Button>
              </div>
            </div>
            <style>{`@keyframes heart-pulse { 0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.8} }`}</style>
          </section>

          {/* BLOOD GROUP CHIPS */}
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Select Blood Group</h3>
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#5b403d]">8 Groups Available</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setSelectedGroup("")}
                className={`shrink-0 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
                  selectedGroup === ""
                    ? "bg-[#b7131a] text-white shadow-sm"
                    : "border border-[#e4beb9] bg-[#ffe9e6] text-[#5b403d] hover:bg-[#ffe2de]"
                }`}
              >
                All
              </button>
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  onClick={() => setSelectedGroup(bg === selectedGroup ? "" : bg)}
                  className={`shrink-0 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
                    selectedGroup === bg
                      ? "bg-[#b7131a] text-white shadow-sm"
                      : "border border-[#e4beb9] bg-[#ffe9e6] text-[#5b403d] hover:bg-[#ffe2de]"
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </section>

          {/* DONOR GRID */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl border border-[#e4beb9] bg-[#fff0ee]" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((donor, i) => {
                const distance = userCoords && donor.latitude && donor.longitude
                  ? calculateDistance(userCoords.latitude, userCoords.longitude, donor.latitude, donor.longitude).toFixed(1)
                  : null;
                const isActive = donor.donor_status === "active";

                const ContactBtn = (
                  <button
                    onClick={() => user && navigate(`/chat/${donor.user_id}`)}
                    className="rounded-lg bg-[#271716] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#b7131a]"
                  >
                    Contact
                  </button>
                );

                return (
                  <motion.div
                    key={donor.user_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.2) }}
                    className="group flex flex-col rounded-xl border border-[#e4beb9] bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-[#b7131a]/10">
                          {donor.avatar_url ? (
                            <img src={donor.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#fff0ee] text-base font-bold text-[#b7131a]">
                              {(donor.full_name || "?").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate text-lg font-semibold leading-tight text-[#271716]">
                            {donor.full_name || "Anonymous"}
                          </h4>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-[#906f6c]">
                            <MapPin className="h-3 w-3" />
                            {distance ? `${distance} km away` : donor.city || "Distance unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-[#ffdad6] text-[#b7131a]">
                        <span className="text-sm font-bold leading-none">{donor.blood_group || "?"}</span>
                        <span className="text-[8px] uppercase opacity-80">Blood</span>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-[#e4beb9]/40 pt-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${isActive ? "bg-[#b7131a] shadow-[0_0_4px_rgba(183,19,26,0.4)]" : "bg-[#906f6c]"}`} />
                        <span className="text-xs text-[#5b403d]">{isActive ? "Available Now" : "Offline"}</span>
                      </div>
                      {user ? ContactBtn : (
                        <AuthRequiredDialog title="Log in to contact" description="Sign in or create an account to contact this donor.">
                          {ContactBtn}
                        </AuthRequiredDialog>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#e4beb9] bg-[#fff0ee] py-12 text-center">
              <Droplet className="mx-auto mb-3 h-10 w-10 text-[#b7131a]/40" />
              <p className="font-semibold text-[#271716]">No donors found</p>
              <p className="mt-1 text-sm text-[#5b403d]">Try adjusting your filters</p>
            </div>
          )}

          {/* CTA BANNER */}
          <section className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-[#b7131a] to-[#db322f] p-4 text-white shadow-xl shadow-[#b7131a]/20 md:flex-row">
            <div className="text-center md:text-left">
              <h3 className="mb-1 text-xl font-semibold">Become a Life Saver</h3>
              <p className="max-w-md text-sm opacity-90">
                Register as a donor today and help someone in your local community during an emergency.
              </p>
            </div>
            {user ? (
              <Button
                onClick={() => navigate("/dashboard")}
                className="rounded-full bg-white px-8 py-6 text-xs font-bold uppercase tracking-wider text-[#b7131a] shadow-lg hover:bg-white/95"
              >
                Register as Donor
              </Button>
            ) : (
              <AuthRequiredDialog title="Log in to register" description="Sign in to register yourself as a blood donor.">
                <Button className="rounded-full bg-white px-8 py-6 text-xs font-bold uppercase tracking-wider text-[#b7131a] shadow-lg hover:bg-white/95">
                  Register as Donor
                </Button>
              </AuthRequiredDialog>
            )}
          </section>

          {/* OPEN REQUESTS */}
          {openRequestsCount > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-center gap-2">
                <Siren className="h-5 w-5 text-[#b7131a]" />
                <h3 className="text-xl font-semibold">Active Requests</h3>
                <span className="rounded-full bg-[#ffdad6] px-2 py-0.5 text-[11px] font-bold text-[#b7131a]">
                  {openRequestsCount}
                </span>
              </div>
              <ActiveBloodRequests hideTitle />
            </section>
          )}

          <div className="mt-6 flex justify-center">
            {user ? (
              <BloodRequestDialog />
            ) : (
              <AuthRequiredDialog title="Log in to request" description="Sign in to post a blood request.">
                <Button className="rounded-full bg-[#b7131a] px-6 text-white hover:bg-[#b7131a]/90">
                  Create Blood Request
                </Button>
              </AuthRequiredDialog>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  );
};

export default BloodDonors;
