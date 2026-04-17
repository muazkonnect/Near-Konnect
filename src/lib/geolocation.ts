// All location logic powered by Google Maps Geolocation API.
// No usage of navigator.geolocation anywhere.

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface GeoWatchResult {
  stop: () => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

async function fetchGoogleLocation(): Promise<Coords> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key not configured");
  }
  const res = await fetch(
    `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_MAPS_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ considerIp: true }),
    },
  );
  if (!res.ok) throw new Error(`Google geolocation failed: ${res.status}`);
  const data = (await res.json()) as { location?: { lat: number; lng: number } };
  if (!data.location) throw new Error("No location returned");
  return { latitude: data.location.lat, longitude: data.location.lng };
}

export function getCurrentPosition(): Promise<Coords> {
  return fetchGoogleLocation();
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Polls Google's geolocation API on an interval. Stop with the returned handle.
export function watchCurrentPosition(
  onSuccess: (coords: Coords) => void,
  onError?: (error: { code: number; message: string }) => void,
): GeoWatchResult {
  let stopped = false;

  const tick = async () => {
    try {
      const coords = await fetchGoogleLocation();
      if (!stopped) onSuccess(coords);
    } catch (err) {
      if (!stopped) {
        const message = err instanceof Error ? err.message : "Unknown error";
        onError?.({ code: 2, message });
      }
    }
  };

  tick();
  const id = window.setInterval(tick, 30000);

  return {
    stop: () => {
      stopped = true;
      window.clearInterval(id);
    },
  };
}
