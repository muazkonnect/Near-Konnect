import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Sparkles } from "lucide-react";
import type { Coords } from "@/lib/geolocation";

const workerIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;font-family:system-ui,-apple-system,sans-serif;">
      <div style="
        width:32px;height:32px;border-radius:9999px;
        background:#000;
        border:3px solid white;
        box-shadow:0 4px 12px -2px rgba(0,0,0,0.5);
        display:grid;place-items:center;color:white;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #000;margin-top:-2px;"></div>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -40],
});

const userIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:16px;height:16px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="position:absolute;inset:-6px;border-radius:9999px;background:rgba(0,0,0,0.3);animation:wm-blink 1.2s ease-in-out infinite;"></div>
      <div style="position:relative;width:16px;height:16px;border-radius:9999px;background:#000;border:3px solid white;box-shadow:0 3px 8px -1px rgba(0,0,0,0.5);animation:wm-blink-dot 1.2s ease-in-out infinite;"></div>
    </div>
    <style>
      @keyframes wm-blink{0%,100%{transform:scale(0.8);opacity:0.7}50%{transform:scale(1.6);opacity:0}}
      @keyframes wm-blink-dot{0%,100%{opacity:1}50%{opacity:0.4}}
    </style>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export interface WorkerPin {
  id: string;
  name: string;
  profession?: string;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  linkToProfile?: boolean;
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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [24.8607, 67.0011],
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);
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
          ? `<div style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:3px 8px;border-radius:9999px;background:hsl(var(--primary)/0.1);color:hsl(var(--primary));font-size:11px;font-weight:600;">${w.distanceKm.toFixed(2)} km away</div>`
          : "";
      m.bindPopup(
        `<div style="min-width:140px;font-family:inherit;">
          <p style="font-weight:700;margin:0;font-size:14px;color:#0f172a;">${w.name}</p>
          ${distanceHtml}
        </div>`,
        { className: "wm-popup", closeButton: false }
      );
      m.addTo(layer);
      points.push([w.latitude, w.longitude]);
    });

    if (userCoords) {
      const um = L.marker([userCoords.latitude, userCoords.longitude], { icon: userIcon });
      um.bindPopup(
        `<div style="font-family:inherit;font-weight:600;font-size:13px;color:#0f172a;">You are here</div>`,
        { className: "wm-popup", closeButton: false }
      );
      um.addTo(layer);
      points.push([userCoords.latitude, userCoords.longitude]);
    }

    if (fitToWorkers && points.length > 0) {
      if (points.length === 1) {
        map.setView(points[0], Math.max(map.getZoom(), 14));
      } else {
        map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 15 });
      }
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [workers, userCoords, fitToWorkers]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-hero text-hero-foreground shadow-premium ring-1 ring-white/10">
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 z-[1] h-44 w-44 rounded-full bg-primary/20 blur-3xl" />

      {/* Header */}
      <div className="relative z-[2] flex items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-hero-muted">
            <Sparkles className="h-3 w-3 text-primary" /> Live Map
          </span>
          <p className="mt-1.5 text-sm font-bold tracking-tight sm:text-base">Nearby services</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>{workers.length} {workers.length === 1 ? "pin" : "pins"}</span>
        </div>
      </div>

      {/* Map */}
      <div className="relative z-[1] mx-3 mb-3 overflow-hidden rounded-2xl ring-1 ring-white/10 sm:mx-4 sm:mb-4" style={{ height }}>
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      </div>

      <style>{`
        .leaflet-container { background: hsl(var(--muted)); font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 13px; }
        .leaflet-container * { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif !important; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 6px 20px -8px rgba(0,0,0,0.3) !important; border-radius: 12px !important; overflow: hidden; }
        .leaflet-control-zoom a { background: white !important; color: #000 !important; border: none !important; width: 34px !important; height: 34px !important; line-height: 34px !important; font-size: 18px !important; font-weight: 500 !important; }
        .leaflet-control-zoom a:hover { background: #f3f4f6 !important; }
        .leaflet-control-attribution { background: rgba(255,255,255,0.85) !important; backdrop-filter: blur(6px); font-size: 10px !important; padding: 2px 6px !important; border-radius: 6px !important; margin: 6px !important; }
        .wm-popup .leaflet-popup-content-wrapper { border-radius: 12px; padding: 4px 6px; box-shadow: 0 12px 30px -12px rgba(0,0,0,0.25); border: 1px solid rgba(0,0,0,0.05); }
        .wm-popup .leaflet-popup-content { margin: 10px 12px; font-weight: 400; }
        .wm-popup .leaflet-popup-tip { box-shadow: 0 4px 10px -4px rgba(0,0,0,0.2); }
      `}</style>
    </div>
  );
};

export default WorkersMap;
