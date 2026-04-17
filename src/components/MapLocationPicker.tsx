import { useState } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";
import { getCurrentPosition, type Coords } from "@/lib/geolocation";
import { toast } from "sonner";

interface MapLocationPickerProps {
  value: Coords | null;
  onChange: (coords: Coords) => void;
}

const DEFAULT_CENTER: Coords = { latitude: 24.8607, longitude: 67.0011 }; // Karachi
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function Recenter({ coords }: { coords: Coords | null }) {
  const map = useMap();
  if (map && coords) {
    map.panTo({ lat: coords.latitude, lng: coords.longitude });
  }
  return null;
}

const MapLocationPicker = ({ value, onChange }: MapLocationPickerProps) => {
  const [locating, setLocating] = useState(false);
  const center = value ?? DEFAULT_CENTER;

  const useCurrent = async () => {
    setLocating(true);
    try {
      const c = await getCurrentPosition();
      onChange(c);
    } catch {
      toast.error("Could not access your location.");
    } finally {
      setLocating(false);
    }
  };

  if (!API_KEY) {
    return (
      <div className="space-y-2">
        <div className="h-56 w-full rounded-lg border bg-muted flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
          Google Maps API key not configured. Add VITE_GOOGLE_MAPS_API_KEY in Workspace Build Secrets.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Tap the map to drop a pin at your fixed service location.</p>
      <div className="h-56 w-full rounded-lg overflow-hidden border">
        <APIProvider apiKey={API_KEY}>
          <Map
            defaultCenter={{ lat: center.latitude, lng: center.longitude }}
            defaultZoom={value ? 14 : 11}
            gestureHandling="greedy"
            disableDefaultUI={false}
            onClick={(e) => {
              if (e.detail.latLng) {
                onChange({ latitude: e.detail.latLng.lat, longitude: e.detail.latLng.lng });
              }
            }}
            style={{ width: "100%", height: "100%" }}
          >
            <Recenter coords={value} />
            {value && <Marker position={{ lat: value.latitude, lng: value.longitude }} />}
          </Map>
        </APIProvider>
      </div>
      <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={useCurrent} disabled={locating}>
        <Navigation className="h-4 w-4" />
        {locating ? "Detecting..." : "Use my current location"}
      </Button>
      {value && (
        <p className="text-xs text-muted-foreground">
          Selected: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
};

export default MapLocationPicker;
