import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Pakistan detection: profile.city contains a known PK city OR phone starts with +92, fallback false.
const PK_CITIES = ["karachi","lahore","islamabad","rawalpindi","faisalabad","multan","peshawar","quetta","sialkot","gujranwala","hyderabad","bahawalpur","sargodha","sukkur","mardan","abbottabad"];

export type PaymentRegion = "pk" | "intl";

export function usePaymentRegion(): { region: PaymentRegion; loading: boolean } {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["region-profile", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("city, phone")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  let region: PaymentRegion = "intl";
  if (data) {
    const city = (data.city || "").toLowerCase();
    const phone = (data.phone || "").replace(/\s/g, "");
    if (phone.startsWith("+92") || phone.startsWith("0092") || PK_CITIES.some((c) => city.includes(c))) {
      region = "pk";
    }
  }
  return { region, loading: isLoading };
}
