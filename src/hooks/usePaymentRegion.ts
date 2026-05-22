import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Pakistan detection priority:
// 1) cached geolocation country (from previous reverse-geocode)
// 2) profile.city contains a known PK city OR phone starts with +92
// 3) live browser geolocation → reverse geocode (Nominatim) → cache
const PK_CITIES = ["karachi","lahore","islamabad","rawalpindi","faisalabad","multan","peshawar","quetta","sialkot","gujranwala","hyderabad","bahawalpur","sargodha","sukkur","mardan","abbottabad"];

export type PaymentRegion = "pk" | "intl";

const CACHE_KEY = "nk_geo_country";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

function getCachedCountry(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { country, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return country || null;
  } catch { return null; }
}

function setCachedCountry(country: string) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ country, ts: Date.now() })); } catch {}
}

async function detectCountryFromGeo(): Promise<string | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 10 * 60_000 });
    });
    const { latitude, longitude } = pos.coords;
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3`, {
      headers: { "Accept": "application/json" },
    });
    const j = await res.json();
    const cc = (j?.address?.country_code || "").toLowerCase();
    if (cc) setCachedCountry(cc);
    return cc || null;
  } catch {
    return null;
  }
}

export function n(): { region: PaymentRegion; loading: boolean } {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["region-detect", user?.id],
    queryFn: async () => {
      // 1) cached geo
      const cached = getCachedCountry();
      if (cached) return { country: cached, profile: null as any };

      // 2) profile
      let profile: any = null;
      if (user?.id) {
        const { data: p } = await (supabase as any)
          .from("profiles")
          .select("city, phone")
          .eq("user_id", user.id)
          .maybeSingle();
        profile = p;
      }

      // 3) live geolocation
      const country = await detectCountryFromGeo();
      return { country, profile };
    },
    staleTime: 5 * 60_000,
  });

  let region: PaymentRegion = "intl";
  if (data?.country === "pk") {
    region = "pk";
  } else if (data?.profile) {
    const city = (data.profile.city || "").toLowerCase();
    const phone = (data.profile.phone || "").replace(/\s/g, "");
    if (phone.startsWith("+92") || phone.startsWith("0092") || PK_CITIES.some((c) => city.includes(c))) {
      region = "pk";
    }
  }
  return { region, loading: isLoading };
}

export const usePaymentRegion = n;
