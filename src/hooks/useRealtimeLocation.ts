import { useCallback, useEffect, useState } from "react";
import { type Coords, watchCurrentPosition } from "@/lib/geolocation";

type LocationStatus = "idle" | "tracking" | "denied" | "error";

const SESSION_KEY = "nk_realtime_location";

export function useRealtimeLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const startTracking = useCallback(() => {
    try {
      const cached = sessionStorage.getItem(SESSION_KEY);
      if (cached && !coords) {
        setCoords(JSON.parse(cached));
      }
    } catch {
      // ignore invalid session value
    }

    setStatus("tracking");
    const watcher = watchCurrentPosition(
      (nextCoords) => {
        setCoords(nextCoords);
        setStatus("tracking");
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextCoords));
      },
      (err) => {
        if (err.code === 1) {
          setStatus("denied");
          return;
        }
        setStatus("error");
      },
    );

    return () => watcher.stop();
  }, [coords]);

  useEffect(() => {
    const stop = startTracking();
    return () => stop?.();
  }, [startTracking]);

  return {
    coords,
    status,
    refresh: startTracking,
  };
}