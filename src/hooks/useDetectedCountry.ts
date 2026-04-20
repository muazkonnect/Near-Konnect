import { useEffect, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { guessCountryFromCoords, guessCountryFromLocale } from "@/lib/countries";

const STORAGE_KEY = "nk_detected_country";
const DEFAULT_COUNTRY: CountryCode = "PK";

/**
 * Detects the user's country once per session.
 * Order: cached → browser locale → GPS reverse-geocode → fallback "PK".
 * The result is meant as a *default* — users can override per input.
 */
export function useDetectedCountry(): CountryCode {
  const [country, setCountry] = useState<CountryCode>(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) return cached as CountryCode;
    } catch {
      /* noop */
    }
    return guessCountryFromLocale() ?? DEFAULT_COUNTRY;
  });

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    if (!navigator.geolocation) {
      try { sessionStorage.setItem(STORAGE_KEY, country); } catch { /* noop */ }
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const iso = await guessCountryFromCoords(pos.coords.latitude, pos.coords.longitude);
        if (cancelled) return;
        if (iso) {
          setCountry(iso);
          try { sessionStorage.setItem(STORAGE_KEY, iso); } catch { /* noop */ }
        } else {
          try { sessionStorage.setItem(STORAGE_KEY, country); } catch { /* noop */ }
        }
      },
      () => {
        try { sessionStorage.setItem(STORAGE_KEY, country); } catch { /* noop */ }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return country;
}
