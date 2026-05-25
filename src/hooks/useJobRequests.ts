import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSetting } from "@/hooks/useAppSettings";
import { calculateDistance, type Coords } from "@/lib/geolocation";

const sb = supabase as any;

export interface JobRequest {
  id: string;
  client_user_id: string;
  main_category: string;
  sub_category: string;
  note: string;
  latitude: number | null;
  longitude: number | null;
  status: "open" | "claimed" | "closed" | "expired";
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  sparks_cost: number;
  expires_at: string;
  created_at: string;
}

export function useJobRequests(viewerCoords?: Coords | null, opts?: { all?: boolean }) {
  const qc = useQueryClient();
  const radiusKm = Number(useAppSetting("job_requests_radius_km" as any) ?? 5);

  const q = useQuery({
    queryKey: ["job_requests", opts?.all ? "all" : "open"],
    queryFn: async (): Promise<JobRequest[]> => {
      let query = sb.from("job_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (!opts?.all) {
        query = query.eq("status", "open").gt("expires_at", new Date().toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as JobRequest[];
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const ch = sb
      .channel("job_requests_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "job_requests" }, () => {
        qc.invalidateQueries({ queryKey: ["job_requests"] });
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [qc]);

  const nearby = useMemo(() => {
    const list = q.data ?? [];
    if (opts?.all || !viewerCoords) return list;
    return list.filter((j) => {
      if (j.latitude == null || j.longitude == null) return false;
      const d = calculateDistance(viewerCoords.latitude, viewerCoords.longitude, j.latitude, j.longitude);
      return d <= radiusKm;
    });
  }, [q.data, viewerCoords, radiusKm, opts?.all]);

  return { ...q, jobs: nearby, allJobs: q.data ?? [], radiusKm };
}

export function useCreateJobRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { main_category: string; sub_category: string; note?: string; latitude?: number | null; longitude?: number | null; }) => {
      if (!user) throw new Error("Sign in required");
      const { data, error } = await sb.from("job_requests").insert({
        client_user_id: user.id,
        main_category: input.main_category,
        sub_category: input.sub_category,
        note: input.note ?? "",
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      }).select().single();
      if (error) throw error;
      return data as JobRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job_requests"] }),
  });
}

export function useClaimJobRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) throw new Error("Sign in required");
      const { data, error } = await sb.from("job_requests")
        .update({ status: "claimed", claimed_by_user_id: user.id, claimed_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("status", "open")
        .select()
        .single();
      if (error) throw error;
      return data as JobRequest;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job_requests"] }),
  });
}

export function useCloseJobRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await sb.from("job_requests").update({ status: "closed" }).eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job_requests"] }),
  });
}

export function useDeleteJobRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await sb.from("job_requests").delete().eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job_requests"] }),
  });
}
