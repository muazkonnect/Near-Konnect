import { useCallback, useEffect, useRef, useState } from "react";
import { type Coords, watchCurrentPosition, getCurrentPosition, calculateDistance } from "@/lib/geolocation";

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
    // If we're already tracking, don't restart unless requested
    if (status === "tracking" && watcherRef.current) return;

    setStatus("locating");

    // 1. Start the watcher immediately. It usually fires faster than getCurrentPosition
    // for the first fix and then continues to track.
    watcherRef.current?.stop();
    
    try {
      watcherRef.current = watchCurrentPosition(
        (next) => {
          setCoords((prev) => {
            // Only update if moved by a significant amount (e.g. > 10 meters)
            // or if it's the first fix. This prevents unnecessary re-renders
            // and re-calculations of distances in consumers like Home.tsx.
            if (!prev) return next;
            
            const dist = calculateDistance(prev.latitude, prev.longitude, next.latitude, next.longitude);
            if (dist < 0.01) return prev; // Less than 10 meters move
            
            return next;
          });
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

    // 2. Fallback: If watcher doesn't fire quickly, try a one-time fix
    // but don't let it block the tracking status if watcher already fired.
    try {
      const initial = await getCurrentPosition();
      setCoords((prev) => {
        if (!prev) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(initial));
          setStatus("tracking");
          return initial;
        }
        return prev;
      });
    } catch (err) {
      // Silent error for fallback
    }
  }, [status]);

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
