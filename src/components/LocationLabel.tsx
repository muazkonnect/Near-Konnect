import { useEffect, useState } from "react";
import { reverseGeocode } from "@/lib/reverseGeocode";

interface Props {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  className?: string;
  fallback?: string;
}

const LocationLabel = ({ latitude, longitude, className, fallback = "—" }: Props) => {
  const [label, setLabel] = useState<string>("Locating…");

  useEffect(() => {
    let cancelled = false;
    if (latitude == null || longitude == null) {
      setLabel(fallback);
      return;
    }
    setLabel("Locating…");
    reverseGeocode(latitude, longitude).then((l) => {
      if (!cancelled) setLabel(l);
    });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, fallback]);

  const title =
    latitude != null && longitude != null
      ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      : undefined;

  return (
    <span className={className} title={title}>
      {label}
    </span>
  );
};

export default LocationLabel;
