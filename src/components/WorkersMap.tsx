import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

const WorkersMap = ({ workers, userCoords, height = "400px", fitToWorkers = true }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [24.8607, 67.0011],
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const invalidate = () => map.invalidateSize();
    const t1 = setTimeout(invalidate, 100);
    const t2 = setTimeout(invalidate, 400);
    const t3 = setTimeout(invalidate, 1000);
    window.addEventListener("resize", invalidate);
    window.addEventListener("orientationchange", invalidate);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("orientationchange", invalidate);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const points: [number, number][] = [];

    workers.forEach((w) => {
      const m = L.marker([w.latitude, w.longitude], { icon: workerIcon });
      const distanceHtml =
        w.distanceKm !== undefined
          ? `<p style="font-size:12px;color:#6b7280;margin:0">${w.distanceKm.toFixed(2)} km away</p>`
          : "";
      m.bindPopup(`<div><p style="font-weight:600;margin:0 0 2px 0">${w.name}</p>${distanceHtml}</div>`);
      m.addTo(layer);
      points.push([w.latitude, w.longitude]);
    });

    if (userCoords) {
      const um = L.marker([userCoords.latitude, userCoords.longitude], { icon: userIcon });
      um.bindPopup("You are here");
      um.addTo(layer);
      points.push([userCoords.latitude, userCoords.longitude]);
    }

    if (fitToWorkers && points.length > 0) {
      if (points.length === 1) {
        map.setView(points[0], Math.max(map.getZoom(), 14));
      } else {
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
      }
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [workers, userCoords, fitToWorkers]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border shadow-sm" style={{ height }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
};

export default WorkersMap;
