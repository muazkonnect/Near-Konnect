export interface Coords {
  latitude: number;
  longitude: number;
}

export interface GeoWatchResult {
  stop: () => void;
}

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
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

export function watchCurrentPosition(
  onSuccess: (coords: Coords) => void,
  onError?: (error: GeolocationPositionError) => void,
): GeoWatchResult {
  if (!navigator.geolocation) {
    throw new Error("Geolocation not supported");
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => onSuccess({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
    (error) => onError?.(error),
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    },
  );

  return {
    stop: () => navigator.geolocation.clearWatch(watchId),
  };
}
