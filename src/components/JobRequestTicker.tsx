import { useNavigate } from "react-router-dom";
import { Briefcase, MapPin, Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSetting } from "@/hooks/useAppSettings";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import { useClaimJobRequest, useJobRequests, type JobRequest } from "@/hooks/useJobRequests";
import { calculateDistance } from "@/lib/geolocation";
import PostJobRequestDialog from "@/components/PostJobRequestDialog";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

function useIsPremiumWorker(userId?: string | null) {
  return useQuery({
    queryKey: ["is_premium_worker", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await sb.from("featured_workers")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .lte("starts_at", new Date().toISOString())
        .gte("ends_at", new Date().toISOString())
        .limit(1);
      if (error) return false;
      return (data?.length ?? 0) > 0;
    },
    staleTime: 60_000,
  });
}

const JobRequestTicker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const enabled = Boolean(useAppSetting("job_requests_enabled" as any) ?? true);
  const requirePremium = Boolean(useAppSetting("job_requests_require_premium_worker" as any) ?? true);
  const { coords } = useRealtimeLocation();
  const { jobs } = useJobRequests(coords);
  const claim = useClaimJobRequest();
  const { data: isPremium } = useIsPremiumWorker(user?.id);

  if (!enabled) return null;

  const handleClaim = async (j: JobRequest) => {
    if (!user) { navigate("/login"); return; }
    if (requirePremium && !isPremium) {
      toast.error("Only premium / featured providers can claim job requests");
      return;
    }
    if (j.client_user_id === user.id) { toast.info("This is your own request"); return; }
    try {
      await claim.mutateAsync(j.id);
      toast.success(`Claimed: Need a ${j.sub_category}`);
      navigate(`/chat?with=${j.client_user_id}&job=${j.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Could not claim job");
    }
  };

  return (
    <div className="overflow-hidden border-b border-hero-foreground/10 bg-primary/10">
      <div className="flex items-stretch">
        <PostJobRequestDialog>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 border-r border-hero-foreground/10 bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Post job
          </button>
        </PostJobRequestDialog>

        <div className="min-w-0 flex-1 overflow-hidden">
          {jobs.length === 0 ? (
            <div className="flex h-full items-center px-3 text-[11px] font-semibold uppercase tracking-wider text-hero-muted">
              <Briefcase className="mr-2 h-3.5 w-3.5" /> No nearby job requests yet — be the first to post one
            </div>
          ) : (
            <div
              className="flex h-full items-center gap-6 whitespace-nowrap px-4"
              style={{ animation: `job-ticker ${Math.max(20, jobs.length * 8)}s linear infinite` }}
            >
              {[...jobs, ...jobs].map((j, i) => {
                const dist = coords && j.latitude != null && j.longitude != null
                  ? calculateDistance(coords.latitude, coords.longitude, j.latitude, j.longitude)
                  : null;
                return (
                  <button
                    key={`${j.id}-${i}`}
                    onClick={() => handleClaim(j)}
                    className="group inline-flex items-center gap-2 text-[12px] font-semibold text-hero-foreground hover:text-primary"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="uppercase tracking-wider text-primary">Need a</span>
                    <span className="font-bold">{j.sub_category}</span>
                    {dist != null && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-hero-muted">
                        <MapPin className="h-3 w-3" /> {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                      </span>
                    )}
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      Claim
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes job-ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
};

export default JobRequestTicker;
