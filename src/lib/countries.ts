// Curated country list for the phone country picker.
// Each entry: ISO 3166-1 alpha-2 code, display name, and E.164 dial code.
// Flag is rendered from the ISO code via regional-indicator emoji.

import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

export interface CountryEntry {
  code: CountryCode;
  name: string;
  dialCode: string; // e.g. "92"
  flag: string;     // e.g. "🇵🇰"
}

const COUNTRY_NAMES: Partial<Record<CountryCode, string>> = (() => {
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return getCountries().reduce((acc, c) => {
      const name = dn.of(c);
      if (name) acc[c] = name;
      return acc;
    }, {} as Partial<Record<CountryCode, string>>);
  } catch {
    return {};
  }
})();

export const codeToFlag = (iso: string): string => {
  if (!iso || iso.length !== 2) return "🌐";
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  return String.fromCodePoint(
    A + iso.toUpperCase().charCodeAt(0) - a,
    A + iso.toUpperCase().charCodeAt(1) - a,
  );
};

export const ALL_COUNTRIES: CountryEntry[] = getCountries()
  .map((code) => ({
    code,
    name: COUNTRY_NAMES[code] || code,
    dialCode: getCountryCallingCode(code),
    flag: codeToFlag(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const COUNTRIES_BY_CODE = new Map<string, CountryEntry>(
  ALL_COUNTRIES.map((c) => [c.code, c]),
);

export const getCountry = (iso: string | undefined | null): CountryEntry | null =>
  iso ? COUNTRIES_BY_CODE.get(iso.toUpperCase()) ?? null : null;

/** Best-effort country guess from browser locale (e.g. "en-PK" → "PK"). */
export const guessCountryFromLocale = (): CountryCode | null => {
  try {
    const candidates = [
      ...(navigator.languages || []),
      navigator.language,
    ].filter(Boolean);
    for (const loc of candidates) {
      const m = /[-_]([A-Z]{2})/i.exec(loc);
      if (m) {
        const iso = m[1].toUpperCase() as CountryCode;
        if (COUNTRIES_BY_CODE.has(iso)) return iso;
      }
    }
  } catch {
    /* noop */
  }
  return null;
};

/** Reverse-geocode a lat/lng to a 2-letter country code via free OSM Nominatim. */
export const guessCountryFromCoords = async (
  latitude: number,
  longitude: number,
): Promise<CountryCode | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const iso = (json?.address?.country_code || "").toUpperCase();
    return iso && COUNTRIES_BY_CODE.has(iso as CountryCode)
      ? (iso as CountryCode)
      : null;
  } catch {
    return null;
  }
};
