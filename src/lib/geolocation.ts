// All location logic uses the browser's native Geolocation API for high accuracy.

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeoWatchResult {
  stop: () => void;
}

const HIGH_ACCURACY_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(err),
      HIGH_ACCURACY_OPTS,
    );
  });
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

// Continuously watch the device's GPS. Filters jittery low-accuracy fixes.
export function watchCurrentPosition(
  onSuccess: (coords: Coords) => void,
  onError?: (error: GeolocationPositionError) => void,
): GeoWatchResult {
  if (!navigator.geolocation) {
    throw new Error("Geolocation not supported");
  }

  let lastAccuracy = Infinity;

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const acc = pos.coords.accuracy ?? Infinity;
      // Skip very poor fixes (>500m) when we already have something better
      if (acc > 500 && lastAccuracy < 500) return;
      lastAccuracy = acc;
      onSuccess({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
    },
    (error) => onError?.(error),
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    },
  );

  return {
    stop: () => navigator.geolocation.clearWatch(watchId),
  };
}
