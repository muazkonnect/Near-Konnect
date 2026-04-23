import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Coords } from "@/lib/geolocation";

const seen = new Set<string>();

async function logEvent(params: {
  adId: string;
  eventType: "impression" | "click";
  placement?: string | null;
  coords?: Coords | null;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from("ad_events").insert({
      ad_id: params.adId,
      event_type: params.eventType,
      placement: params.placement ?? null,
      viewer_user_id: user?.id ?? null,
      viewer_latitude: params.coords?.latitude ?? null,
      viewer_longitude: params.coords?.longitude ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
    });
  } catch {
    /* swallow tracking errors */
  }
}

/**
 * Fires a single impression per ad+placement per session as soon as the
 * referenced node becomes >=50% visible in the viewport.
 */
export function useAdImpression(
  adId: string | undefined,
  placement: string | undefined,
  coords?: Coords | null
) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!adId || !ref.current) return;
    const key = `${adId}::${placement ?? ""}`;
    if (seen.has(key)) return;
    const node = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            seen.add(key);
            logEvent({ adId, eventType: "impression", placement, coords });
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: [0.5] }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [adId, placement, coords?.latitude, coords?.longitude]);

  return ref;
}

export function useAdClick() {
  return useCallback(
    (adId: string, placement?: string | null, coords?: Coords | null) =>
      logEvent({ adId, eventType: "click", placement, coords }),
    []
  );
}
