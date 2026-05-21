import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Worker } from "@/data/mockData";
import { parseContactMethods, type ContactMethod } from "@/lib/contactMethods";
import { useEffect } from "react";

export function useWorkers() {
  const queryClient = useQueryClient();

  // 1. Set up Realtime listener
  useEffect(() => {
    const channelName = `workers-rt-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(channelName);
    
    channel.on("postgres_changes", { event: "*", schema: "public", table: "workers" }, () => {
      queryClient.invalidateQueries({ queryKey: ["workers_list"] });
    });
    channel.on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
      queryClient.invalidateQueries({ queryKey: ["workers_list"] });
    });
    channel.on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => {
      queryClient.invalidateQueries({ queryKey: ["workers_list"] });
    });
    
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ["workers_list"],
    queryFn: async () => {
      // 1. Fetch workers with profiles and reviews in one go
      // reviews(rating) will return an array of objects like { rating: 5 }
      const { data, error } = await supabase
        .from("workers")
        .select(`
          *,
          profiles!workers_user_id_fkey_profiles(full_name, phone, avatar_url, use_whatsapp, contact_methods),
          reviews(rating)
        `)
        .order("experience", { ascending: false });

      if (error) throw error;

      const workerData = data || [];

      // 2. Map the data to our Worker interface
      const mapped: Worker[] = workerData.map((w: any) => {
        const profile = w.profiles;
        const reviews = w.reviews || [];
        
        const reviewCount = reviews.length;
        const ratingSum = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
        const rating = reviewCount > 0 ? Math.round((ratingSum / reviewCount) * 10) / 10 : 0;

        const finalProfession = w.profession || "General Service";

        return {
          id: w.id,
          uid: w.uid || undefined,
          name: profile?.full_name || "Worker",
          profession: finalProfession,
          rating,
          reviewCount,
          experience: w.experience,
          distance: 0, // Will be calculated by consumer
          available: w.available,
          verified: w.verified,
          phone: profile?.phone || "",
          description: w.description || "",
          serviceAreas: w.service_areas || [],
          profilePhoto: profile?.avatar_url || "",
          city: w.city || "",
          latitude: w.latitude ?? undefined,
          longitude: w.longitude ?? undefined,
          mainCategory: w.main_category || "",
          subCategory: w.sub_category || "",
          userId: w.user_id,
        };
      });

      return mapped;
    },
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000, // 5 minutes
  });
}
