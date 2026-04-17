import { useCallback, useEffect, useRef, useState } from "react";
import { type Coords, watchCurrentPosition, getCurrentPosition } from "@/lib/geolocation";

type LocationStatus = "idle" | "locating" | "tracking" | "denied" | "error";

const SESSION_KEY = "nk_realtime_location";

export function useRealtimeLocation() {
  const [coords, setCoords] = useState<Coords | null>(() => {
    try {
      const cached = sessionStorage.getItem(SESSION_KEY);
      return cached ? (JSON.parse(cached) as Coords) : null;
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState<LocationStatus>("idle");
  const watcherRef = useRef<{ stop: () => void } | null>(null);

  const start = useCallback(async () => {
    setStatus("locating");

    // Get a quick high-accuracy fix immediately
    try {
      const initial = await getCurrentPosition();
      setCoords(initial);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(initial));
      setStatus("tracking");
    } catch (err) {
      const code = (err as GeolocationPositionError)?.code;
      if (code === 1) {
        setStatus("denied");
        return;
      }
      setStatus("error");
    }

    // Then keep it updated continuously
    watcherRef.current?.stop();
    try {
      watcherRef.current = watchCurrentPosition(
        (next) => {
          setCoords(next);
          setStatus("tracking");
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
        },
        (err) => {
          if (err.code === 1) setStatus("denied");
          else setStatus("error");
        },
      );
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    start();
    return () => {
      watcherRef.current?.stop();
      watcherRef.current = null;
    };
  }, [start]);

  return {
    coords,
    status,
    refresh: start,
  };
}
