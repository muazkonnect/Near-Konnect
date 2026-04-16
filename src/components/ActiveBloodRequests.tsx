import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, MapPin, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

const urgencyStyles: Record<string, string> = {
  normal: "bg-success/15 text-success border-success/20",
  urgent: "bg-warning/15 text-warning border-warning/20",
  critical: "bg-destructive/15 text-destructive border-destructive/20 animate-pulse",
};

interface ActiveBloodRequestsProps {
  compact?: boolean;
  hideTitle?: boolean;
}

const ActiveBloodRequests = ({ compact = false, hideTitle = false }: ActiveBloodRequestsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ["blood_requests_active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!data || data.length === 0) return [];

      const requesterIds = [...new Set(data.map((r) => r.requester_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, city")
        .in("user_id", requesterIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return data.map((r) => ({
        ...r,
        requester_name: profileMap.get(r.requester_id)?.full_name || "Someone",
        requester_city: r.city || profileMap.get(r.requester_id)?.city || null,
      }));
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel(`blood-req-list-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "blood_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["blood_requests_active"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  if (requests.length === 0) return null;

  return (
    <section className={compact ? "py-2" : "container mx-auto px-4 py-8"}>
      {!hideTitle && (
      <div className="mb-5 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Active Blood Requests</h2>
        <Badge className="ml-2 rounded-full bg-destructive text-destructive-foreground">{requests.length}</Badge>
      </div>
      )}
      <div className={compact ? "-mx-1 flex gap-3 overflow-x-auto px-1 pb-2" : "grid gap-4 md:grid-cols-2 lg:grid-cols-3"}>
        {requests.map((req, i) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`relative overflow-hidden rounded-2xl border bg-card p-5 transition-shadow hover:shadow-lg ${compact ? "w-[290px] shrink-0" : ""}`}
          >
            {req.urgency === "critical" && (
              <div className="absolute left-0 right-0 top-0 h-1 bg-destructive" />
            )}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-card-foreground">{req.requester_name}</p>
                {req.requester_city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {req.requester_city}
                  </p>
                )}
              </div>
              <Badge className={`text-xs font-bold border rounded-full px-3 py-1 ${urgencyStyles[req.urgency] || urgencyStyles.normal}`}>
                {req.urgency === "critical" && <AlertTriangle className="w-3 h-3 mr-1" />}
                {req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <span className="text-lg font-extrabold text-destructive">{req.blood_group}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Needs {req.blood_group} blood</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            {req.message && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mb-3 line-clamp-2">
                {req.message}
              </p>
            )}

            {req.requester_id !== user?.id && (
              <Button
                size="sm"
                className="w-full gap-1.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => navigate(`/chat/${req.requester_id}`)}
              >
                <MessageSquare className="h-3.5 w-3.5" /> Help Now
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ActiveBloodRequests;
