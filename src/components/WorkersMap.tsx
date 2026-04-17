import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import type { Coords } from "@/lib/geolocation";

const workerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const userIcon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:hsl(var(--primary));border:3px solid white;box-shadow:0 0 0 2px hsl(var(--primary)/0.4)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export interface WorkerPin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
}

interface Props {
  workers: WorkerPin[];
  userCoords?: Coords | null;
  height?: string;
  fitToWorkers?: boolean;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [points, map]);
  return null;
}

function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const run = () => map.invalidateSize();
    const t1 = setTimeout(run, 100);
    const t2 = setTimeout(run, 400);
    const t3 = setTimeout(run, 1000);
    window.addEventListener("resize", run);
    window.addEventListener("orientationchange", run);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", run);
      window.removeEventListener("orientationchange", run);
    };
  }, [map]);
  return null;
}

const WorkersMap = ({ workers, userCoords, height = "400px", fitToWorkers = true }: Props) => {
  const points: [number, number][] = workers.map((w) => [w.latitude, w.longitude]);
  if (userCoords) points.push([userCoords.latitude, userCoords.longitude]);
  const center: [number, number] = points[0] ?? [24.8607, 67.0011];

  return (
    <div className="w-full overflow-hidden rounded-2xl border shadow-sm" style={{ height }}>
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom zoomControl={true} attributionControl={true}>
        <InvalidateOnMount />
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {fitToWorkers && points.length > 0 && <FitBounds points={points} />}
        {userCoords && (
          <Marker position={[userCoords.latitude, userCoords.longitude]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        {workers.map((w) => (
          <Marker key={w.id} position={[w.latitude, w.longitude]} icon={workerIcon}>
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{w.name}</p>
                {w.distanceKm !== undefined && (
                  <p className="text-xs text-muted-foreground">{w.distanceKm.toFixed(2)} km away</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default WorkersMap;
