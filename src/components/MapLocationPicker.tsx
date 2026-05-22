import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Navigation, Search } from "lucide-react";
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
  radiusKm?: number;
}

type Suggestion = { display_name: string; lat: string; lon: string };

const DEFAULT_CENTER: Coords = { latitude: 24.8607, longitude: 67.0011 };

const MapLocationPicker = ({ value, onChange, radiusKm }: MapLocationPickerProps) => {
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (value && radiusKm && radiusKm > 0) {
      const latlng: L.LatLngTuple = [value.latitude, value.longitude];
      const radiusM = radiusKm * 1000;
      if (circleRef.current) {
        circleRef.current.setLatLng(latlng);
        circleRef.current.setRadius(radiusM);
      } else {
        circleRef.current = L.circle(latlng, {
          radius: radiusM,
          color: "hsl(var(--primary))",
          weight: 2,
          fillColor: "hsl(var(--primary))",
          fillOpacity: 0.15,
        }).addTo(map);
      }
      map.fitBounds(circleRef.current.getBounds(), { padding: [20, 20], maxZoom: 15 });
    } else if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }
  }, [value, radiusKm]);

  // Debounced autocomplete via Nominatim
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal, headers: { "Accept-Language": navigator.language || "en" } },
        );
        const data: Suggestion[] = await res.json();
        setSuggestions(data || []);
        setShowSuggestions(true);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  const pickSuggestion = (s: Suggestion) => {
    const lat = parseFloat(s.lat);
    const lon = parseFloat(s.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    setQuery(s.display_name);
    setShowSuggestions(false);
    onChange({ latitude: lat, longitude: lon });
  };

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
      <p className="text-xs text-muted-foreground">
        Search for a place, use your current location, or tap the map to drop a pin.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Search address, area, or city…"
          className="pl-9"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-[1000] mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-lg">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(s)}
                className="block w-full truncate px-3 py-2 text-left text-xs hover:bg-accent"
              >
                {s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="h-56 w-full overflow-hidden rounded-lg border">
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
