import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Pakistan detection priority:
// 1) cached country
// 2) profile city/phone hints
// 3) live browser geolocation -> reverse geocode
// 4) IP geolocation fallback
// 5) timezone / locale heuristic
const PK_CITIES = ["karachi","lahore","islamabad","rawalpindi","faisalabad","multan","peshawar","quetta","sialkot","gujranwala","hyderabad","bahawalpur","sargodha","sukkur","mardan","abbottabad"];

export type PaymentRegion = "pk" | "intl";
export type RegionSource = "cache" | "profile" | "geo" | "ip" | "locale" | "default";

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
    return cc || null;
  } catch {
    return null;
  }
}

async function detectCountryFromIp(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    const cc = (j?.country_code || j?.country || "").toLowerCase();
    return cc || null;
  } catch {
    return null;
  }
}

function detectCountryFromLocale(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/Karachi|Islamabad/i.test(tz)) return "pk";
    const langs = (navigator.languages || [navigator.language || ""]).join(",").toLowerCase();
    if (/-pk\b|\bur(-|$)/.test(langs)) return "pk";
    return null;
  } catch { return null; }
}

export function n(): { region: PaymentRegion; loading: boolean; source: RegionSource; detected: boolean } {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["region-detect", user?.id],
    queryFn: async (): Promise<{ country: string | null; source: RegionSource; profile: any }> => {
      // 1) cached geo
      const cached = getCachedCountry();
      if (cached) return { country: cached, source: "cache", profile: null };

      // 2) profile hints (return early if conclusive PK signal)
      let profile: any = null;
      if (user?.id) {
        const { data: p } = await (supabase as any)
          .from("profiles")
          .select("city, profile_phones(phone)")
          .eq("user_id", user.id)
          .maybeSingle();
        profile = p ? { city: p.city, phone: p.profile_phones?.phone } : null;
        if (profile) {
          const city = (profile.city || "").toLowerCase();
          const phone = (profile.phone || "").replace(/\s/g, "");
          if (phone.startsWith("+92") || phone.startsWith("0092") || PK_CITIES.some((c) => city.includes(c))) {
            return { country: "pk", source: "profile", profile };
          }
        }
      }

      // 3) live geolocation
      const geo = await detectCountryFromGeo();
      if (geo) { setCachedCountry(geo); return { country: geo, source: "geo", profile }; }

      // 4) IP geolocation fallback
      const ip = await detectCountryFromIp();
      if (ip) { setCachedCountry(ip); return { country: ip, source: "ip", profile }; }

      // 5) locale / timezone heuristic
      const loc = detectCountryFromLocale();
      if (loc) return { country: loc, source: "locale", profile };

      return { country: null, source: "default", profile };
    },
    staleTime: 5 * 60_000,
  });

  const region: PaymentRegion = data?.country === "pk" ? "pk" : "intl";
  const source: RegionSource = data?.source ?? "default";
  return { region, loading: isLoading, source, detected: source !== "default" };
}

export const usePaymentRegion = n;
