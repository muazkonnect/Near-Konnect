// Lightweight reverse geocoding with caching. Uses OpenStreetMap Nominatim.

const memCache = new Map<string, string>();
const LS_PREFIX = "nk_revgeo_";

const key = (lat: number, lng: number) =>
  `${lat.toFixed(5)},${lng.toFixed(5)}`;

const fallback = (lat: number, lng: number) =>
  `${lat.toFixed(3)}, ${lng.toFixed(3)}`;

function buildLabel(addr: Record<string, string> | undefined): string | null {
  if (!addr) return null;
  const locality =
    addr.suburb ||
    addr.neighbourhood ||
    addr.village ||
    addr.town ||
    addr.city_district ||
    addr.hamlet;
  const city = addr.city || addr.town || addr.village || addr.state_district;
  const region = addr.state || addr.region || addr.country;
  const parts = [locality, city, region].filter(
    (p, i, arr) => p && arr.indexOf(p) === i,
  );
  return parts.length ? parts.slice(0, 2).join(", ") : null;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  const k = key(latitude, longitude);
  if (memCache.has(k)) return memCache.get(k)!;
  try {
    const ls = localStorage.getItem(LS_PREFIX + k);
    if (ls) {
      memCache.set(k, ls);
      return ls;
    }
  } catch {
    /* noop */
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("geocode failed");
    const json = await res.json();
    const label =
      buildLabel(json.address) ||
      (typeof json.display_name === "string"
        ? String(json.display_name).split(",").slice(0, 2).join(",").trim()
        : null) ||
      fallback(latitude, longitude);
    memCache.set(k, label);
    try {
      localStorage.setItem(LS_PREFIX + k, label);
    } catch {
      /* noop */
    }
    return label;
  } catch {
    return fallback(latitude, longitude);
  }
}
