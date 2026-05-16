import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { getCurrentPosition } from "@/lib/geolocation";
import { reverseGeocode } from "@/lib/reverseGeocode";

const STORAGE_KEY = "nk_current_location_label";

interface Props {
  className?: string;
}

const CurrentLocationChip = ({ className = "" }: Props) => {
  const [label, setLabel] = useState<string | null>(() => {
    try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  useEffect(() => {
    if (label) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await getCurrentPosition();
        const l = await reverseGeocode(c.latitude, c.longitude);
        if (cancelled) return;
        setLabel(l);
        try { sessionStorage.setItem(STORAGE_KEY, l); } catch { /* noop */ }
      } catch {
        /* silent */
      }
    })();
    return () => { cancelled = true; };
  }, [label]);

  if (!label) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] text-hero-foreground/60 ${className}`}
      title="Your approximate current location"
    >
      <MapPin className="h-3 w-3 text-primary" />
      <span className="max-w-[140px] truncate">{label}</span>
    </span>
  );
};

export default CurrentLocationChip;
