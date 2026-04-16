import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Droplet, ArrowRight, AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import BloodRequestDialog from "./BloodRequestDialog";

interface Props {
  showRequestButton?: boolean;
  compact?: boolean;
}

const BloodDonationBanner = ({ showRequestButton = true, compact = false }: Props) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ donors: 0, activeRequests: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: donorCount }, { count: requestCount }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_blood_donor", true).eq("donor_status", "active"),
        supabase.from("blood_requests").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setStats({ donors: donorCount || 0, activeRequests: requestCount || 0 });
    };
    fetchStats();
  }, []);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-red-200/40 bg-gradient-to-r from-red-50/80 to-rose-50/50 dark:from-red-950/30 dark:to-rose-950/20 dark:border-red-800/30 p-6 md:p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Heart className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground mb-1">Blood Donation Network</h3>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-red-500">{stats.donors}</span> active donors
              {stats.activeRequests > 0 && (
                <> · <span className="font-semibold text-orange-500">{stats.activeRequests}</span> active requests</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {showRequestButton && <BloodRequestDialog />}
            <Button variant="outline" onClick={() => navigate("/blood-donors")} className="rounded-xl gap-1 border-red-200 text-red-600 hover:bg-red-50">
              Find Donors <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-red-200/40 bg-gradient-to-br from-red-50 via-rose-50/60 to-pink-50/40 dark:from-red-950/30 dark:via-rose-950/20 dark:to-pink-950/10 dark:border-red-800/30 p-8 md:p-12"
    >
      {/* Decorative elements */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl" />

      <div className="relative grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <Badge className="bg-red-500/10 text-red-600 border-red-200 rounded-full px-3">
              Save Lives
            </Badge>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3 leading-tight">
            Blood Donation<br />Network
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
            Connect with willing blood donors in your community. Request blood in emergencies or register as a donor to help save lives.
          </p>
          <div className="flex flex-wrap gap-3">
            {showRequestButton && <BloodRequestDialog />}
            <Button
              variant="outline"
              onClick={() => navigate("/blood-donors")}
              className="rounded-xl gap-2 border-red-200 text-red-600 hover:bg-red-50"
            >
              <Users className="w-4 h-4" /> Browse Donors
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl border border-red-100 dark:border-red-900/30 p-5 text-center">
            <Droplet className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-3xl font-extrabold text-red-500">{stats.donors}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Donors</p>
          </div>
          <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl border border-orange-100 dark:border-orange-900/30 p-5 text-center">
            <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-3xl font-extrabold text-orange-500">{stats.activeRequests}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Requests</p>
          </div>
          <div className="col-span-2 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl border border-green-100 dark:border-green-900/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              🩸 Every donation can save up to <span className="font-bold text-foreground">3 lives</span>
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default BloodDonationBanner;
