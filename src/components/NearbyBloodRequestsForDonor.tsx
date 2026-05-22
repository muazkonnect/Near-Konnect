import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, MapPin, MessageSquare, Siren } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import { useAppSetting } from "@/hooks/useAppSettings";
import { formatDistanceToNow } from "date-fns";

const urgencyStyles: Record<string, string> = {
  normal: "bg-success/15 text-success border-success/20",
  urgent: "bg-warning/15 text-warning border-warning/20",
  critical: "bg-destructive/15 text-destructive border-destructive/20 animate-pulse",
};

interface NearbyReq {
  id: string;
  requester_id: string;
  requester_name: string | null;
  blood_group: string;
  urgency: string;
  city: string | null;
  message: string | null;
  created_at: string;
  distance_km: number | null;
}

const NearbyBloodRequestsForDonor = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coords } = useRealtimeLocation();
  const [profile, setProfile] = useState<{ is_blood_donor: boolean; blood_group: string | null } | null>(null);

  // Persist donor location to profile so others can match by distance
  useEffect(() => {
    if (!user || !coords || !profile?.is_blood_donor) return;
    supabase
      .from("profiles")
      .update({ latitude: coords.latitude, longitude: coords.longitude } as any)
      .eq("user_id", user.id)
      .then(() => {});
  }, [user, coords?.latitude, coords?.longitude, profile?.is_blood_donor]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_blood_donor, blood_group")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data as any));
  }, [user]);

  const enabled = !!user && !!profile?.is_blood_donor && !!profile?.blood_group && !!coords;

  const bloodRadius = useAppSetting("blood_donors_radius_km");
  const { data: requests = [] } = useQuery({
    queryKey: ["nearby_blood_requests", coords?.latitude, coords?.longitude, profile?.blood_group, bloodRadius],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_nearby_blood_requests", {
        donor_lat: coords!.latitude,
        donor_lng: coords!.longitude,
        donor_blood_group: profile!.blood_group,
        radius_km: bloodRadius,
      });
      if (error) throw error;
      return ((data || []) as NearbyReq[]).filter((r) => r.requester_id !== user?.id);
    },
    enabled,
    refetchInterval: 30_000,
  });

  if (!enabled || requests.length === 0) return null;

  return (
    <section className="blood-shell mb-5 rounded-3xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Siren className="h-5 w-5 text-destructive animate-pulse" />
        <h3 className="font-bold text-foreground">Incoming requests for you</h3>
        <Badge className="ml-auto rounded-full bg-destructive text-destructive-foreground">{requests.length}</Badge>
      </div>
      <div className="space-y-2">
        {requests.slice(0, 5).map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border bg-card p-3"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{req.requester_name || "Someone"}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {req.city && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" /> {req.city}
                    </span>
                  )}
                  {req.distance_km != null && (
                    <span className="font-medium text-foreground">{req.distance_km.toFixed(1)} km</span>
                  )}
                  <span>{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              <Badge className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${urgencyStyles[req.urgency] || urgencyStyles.normal}`}>
                {req.urgency === "critical" && <AlertTriangle className="mr-0.5 h-3 w-3" />}
                {req.urgency.toUpperCase()}
              </Badge>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-sm font-extrabold text-destructive ring-1 ring-destructive/20">
                {req.blood_group}
              </span>
            </div>
            {req.message && (
              <p className="mb-2 line-clamp-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">{req.message}</p>
            )}
            <Button
              size="sm"
              className="w-full gap-1.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => navigate(`/chat/${req.requester_id}`)}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Help Now
            </Button>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default NearbyBloodRequestsForDonor;
