import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Navigation, Search, MapOff } from "lucide-react";
import { getCurrentPosition, type Coords } from "@/lib/geolocation";
import { toast } from "sonner";
import LocationLabel from "@/components/LocationLabel";
import { isGoogleMapsConfigured, loadGoogleMaps } from "@/components/maps/useGoogleMaps";

interface MapLocationPickerProps {
  value: Coords | null;
  onChange: (coords: Coords) => void;
  radiusKm?: number;
}

type Suggestion = { placeId: string; primary: string; secondary: string };

const DEFAULT_CENTER: Coords = { latitude: 24.8607, longitude: 67.0011 };

const MapLocationPicker = ({ value, onChange, radiusKm }: MapLocationPickerProps) => {
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Load Maps JS once
  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setLoadError(true);
      return;
    }
    let mounted = true;
    loadGoogleMaps()
      .then(() => mounted && setReady(true))
      .catch(() => mounted && setLoadError(true));
    return () => {
      mounted = false;
    };
  }, []);

  // Init map
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const center = value ?? DEFAULT_CENTER;
    const map = new google.maps.Map(containerRef.current, {
      center: { lat: center.latitude, lng: center.longitude },
      zoom: value ? 15 : 11,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      clickableIcons: false,
    });
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      onChangeRef.current({ latitude: e.latLng.lat(), longitude: e.latLng.lng() });
    });
    mapRef.current = map;
  }, [ready]);

  // Marker sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (value) {
      const pos = { lat: value.latitude, lng: value.longitude };
      if (markerRef.current) {
        markerRef.current.setPosition(pos);
      } else {
        markerRef.current = new google.maps.Marker({ position: pos, map });
      }
      map.panTo(pos);
      if ((map.getZoom() ?? 0) < 15) map.setZoom(15);
    } else if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }, [value, ready]);

  // Radius circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (value && radiusKm && radiusKm > 0) {
      const pos = { lat: value.latitude, lng: value.longitude };
      const radiusM = radiusKm * 1000;
      if (circleRef.current) {
        circleRef.current.setCenter(pos);
        circleRef.current.setRadius(radiusM);
      } else {
        circleRef.current = new google.maps.Circle({
          map,
          center: pos,
          radius: radiusM,
          strokeColor: "#000",
          strokeWeight: 2,
          fillColor: "#000",
          fillOpacity: 0.1,
        });
      }
      const b = circleRef.current.getBounds();
      if (b) map.fitBounds(b, 20);
    } else if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
  }, [value, radiusKm, ready]);

  // Autocomplete suggestions (Places API New via JS library)
  useEffect(() => {
    if (!ready) return;
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        const { suggestions: raw } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: sessionTokenRef.current,
        });
        if (cancelled) return;
        const mapped: Suggestion[] = raw
          .map((s) => {
            const p = s.placePrediction;
            if (!p) return null;
            return {
              placeId: p.placeId,
              primary: p.mainText?.text ?? p.text.text,
              secondary: p.secondaryText?.text ?? "",
            };
          })
          .filter(Boolean) as Suggestion[];
        setSuggestions(mapped);
        setShowSuggestions(true);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, ready]);

  const pickSuggestion = async (s: Suggestion) => {
    setShowSuggestions(false);
    setQuery(`${s.primary}${s.secondary ? ", " + s.secondary : ""}`);
    try {
      const { Place } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
      const place = new Place({ id: s.placeId });
      await place.fetchFields({ fields: ["location", "formattedAddress"] });
      const loc = place.location;
      if (!loc) return;
      onChange({ latitude: loc.lat(), longitude: loc.lng() });
      sessionTokenRef.current = null; // end session
    } catch {
      toast.error("Couldn't load that place. Try another result.");
    }
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

  if (loadError) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-lg border bg-muted/40 p-4 text-center">
        <MapOff className="h-6 w-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Map unavailable. Please try again later.</p>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={useCurrent} disabled={locating}>
          <Navigation className="h-4 w-4" />
          {locating ? "Detecting..." : "Use my current location"}
        </Button>
      </div>
    );
  }

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
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(s)}
                className="block w-full px-3 py-2 text-left text-xs hover:bg-accent"
              >
                <div className="truncate font-medium">{s.primary}</div>
                {s.secondary && (
                  <div className="truncate text-[11px] text-muted-foreground">{s.secondary}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="h-56 w-full overflow-hidden rounded-lg border bg-muted">
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
