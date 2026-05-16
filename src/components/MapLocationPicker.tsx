import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";
import { getCurrentPosition, type Coords } from "@/lib/geolocation";
import { toast } from "sonner";
import LocationLabel from "@/components/LocationLabel";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapLocationPickerProps {
  value: Coords | null;
  onChange: (coords: Coords) => void;
}

const DEFAULT_CENTER: Coords = { latitude: 24.8607, longitude: 67.0011 };

const MapLocationPicker = ({ value, onChange }: MapLocationPickerProps) => {
  const [locating, setLocating] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center = value ?? DEFAULT_CENTER;
    const map = L.map(containerRef.current, {
      center: [center.latitude, center.longitude],
      zoom: value ? 15 : 11,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      onChangeRef.current({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    });

    mapRef.current = map;

    const invalidate = () => map.invalidateSize();
    const t1 = setTimeout(invalidate, 100);
    const t2 = setTimeout(invalidate, 400);
    window.addEventListener("resize", invalidate);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", invalidate);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Sync marker + recenter when value changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (value) {
      const latlng: L.LatLngTuple = [value.latitude, value.longitude];
      if (markerRef.current) {
        markerRef.current.setLatLng(latlng);
      } else {
        markerRef.current = L.marker(latlng, { icon: markerIcon }).addTo(map);
      }
      map.setView(latlng, Math.max(map.getZoom(), 15));
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [value]);

  const useCurrent = async () => {
    setLocating(true);
    try {
      const c = await getCurrentPosition();
      onChange(c);
    } catch {
      toast.error("Could not access your location. Please enable GPS permissions.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Tap the map to drop a pin at your fixed service location.</p>
      <div className="h-56 w-full rounded-lg overflow-hidden border">
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      </div>
      <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={useCurrent} disabled={locating}>
        <Navigation className="h-4 w-4" />
        {locating ? "Detecting..." : "Use my current location"}
      </Button>
      {value && (
        <p className="text-xs text-muted-foreground">
          Selected: <LocationLabel latitude={value.latitude} longitude={value.longitude} />
          {value.accuracy ? ` (±${Math.round(value.accuracy)}m)` : ""}
        </p>
      )}
    </div>
  );
};

export default MapLocationPicker;
