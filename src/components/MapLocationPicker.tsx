import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";
import { getCurrentPosition, type Coords } from "@/lib/geolocation";
import { toast } from "sonner";

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

function ClickHandler({ onChange }: { onChange: (coords: Coords) => void }) {
  useMapEvents({
    click: (e) => onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  });
  return null;
}

function Recenter({ coords }: { coords: Coords | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView([coords.latitude, coords.longitude], Math.max(map.getZoom(), 15));
  }, [coords, map]);
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
      toast.error("Could not access your location. Please enable GPS permissions.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Tap the map to drop a pin at your fixed service location.</p>
      <div className="h-56 w-full rounded-lg overflow-hidden border">
        <MapContainer
          center={[center.latitude, center.longitude]}
          zoom={value ? 15 : 11}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={onChange} />
          <Recenter coords={value} />
          {value && <Marker position={[value.latitude, value.longitude]} icon={markerIcon} />}
        </MapContainer>
      </div>
      <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={useCurrent} disabled={locating}>
        <Navigation className="h-4 w-4" />
        {locating ? "Detecting..." : "Use my current location"}
      </Button>
      {value && (
        <p className="text-xs text-muted-foreground">
          Selected: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
          {value.accuracy ? ` (±${Math.round(value.accuracy)}m)` : ""}
        </p>
      )}
    </div>
  );
};

export default MapLocationPicker;
