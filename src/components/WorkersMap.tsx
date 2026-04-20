import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Sparkles } from "lucide-react";
import type { Coords } from "@/lib/geolocation";

// Profession → SVG path (lucide). Falls back to MapPin.
const PROFESSION_ICONS: { keywords: string[]; svg: string }[] = [
  // Wrench (plumber, mechanic, repair)
  { keywords: ["plumb", "mechanic", "repair", "fix", "handyman", "maint"], svg: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>` },
  // Zap (electrician)
  { keywords: ["electric", "wire", "elect"], svg: `<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>` },
  // Paintbrush (painter)
  { keywords: ["paint"], svg: `<path d="M14.622 17.897 10.03 13.31"/><path d="M18.793 4.207a2.83 2.83 0 0 1 4 4L8.473 22.527l-5.656 1.414 1.414-5.657z"/>` },
  // Scissors (barber, tailor, salon)
  { keywords: ["barber", "hair", "salon", "tailor", "stylist"], svg: `<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>` },
  // ChefHat (cook, chef)
  { keywords: ["chef", "cook", "kitchen"], svg: `<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/>` },
  // Truck (driver, mover)
  { keywords: ["driver", "transport", "deliver", "mover", "haul"], svg: `<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>` },
  // Sparkles (cleaner, maid)
  { keywords: ["clean", "maid", "wash"], svg: `<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>` },
  // Camera (photographer)
  { keywords: ["photo", "camera", "video"], svg: `<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>` },
  // Stethoscope (doctor, medic, nurse)
  { keywords: ["doctor", "medic", "nurse", "health"], svg: `<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>` },
  // GraduationCap (teacher, tutor)
  { keywords: ["teach", "tutor", "instructor", "lesson"], svg: `<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>` },
  // Code (developer, programmer, IT)
  { keywords: ["develop", "program", "code", "software", "web", "app", "it ", "tech"], svg: `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>` },
  // Hammer (carpenter, construction, mason)
  { keywords: ["carpent", "wood", "construct", "mason", "builder"], svg: `<path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"/>` },
  // Flower (gardener)
  { keywords: ["garden", "land", "plant"], svg: `<circle cx="12" cy="12" r="3"/><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"/><path d="M12 7.5V9"/><path d="M7.5 12H9"/><path d="M16.5 12H15"/><path d="M12 16.5V15"/><path d="m8 8 1.88 1.88"/><path d="M14.12 9.88 16 8"/><path d="m8 16 1.88-1.88"/><path d="M14.12 14.12 16 16"/>` },
  // ShieldCheck (security, guard)
  { keywords: ["security", "guard"], svg: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>` },
  // Briefcase (default professional)
  { keywords: ["consult", "advis", "agent", "manag"], svg: `<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>` },
];
const DEFAULT_PIN_SVG = `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`;
const getProfessionSvg = (profession?: string) => {
  if (!profession) return DEFAULT_PIN_SVG;
  const p = profession.toLowerCase();
  for (const entry of PROFESSION_ICONS) {
    if (entry.keywords.some((k) => p.includes(k))) return entry.svg;
  }
  return DEFAULT_PIN_SVG;
};
const buildWorkerIcon = (profession?: string) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;font-family:system-ui,-apple-system,sans-serif;">
        <div style="width:34px;height:34px;border-radius:9999px;background:#000;border:3px solid white;box-shadow:0 4px 12px -2px rgba(0,0,0,0.5);display:grid;place-items:center;color:white;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${getProfessionSvg(profession)}</svg>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #000;margin-top:-2px;"></div>
      </div>
    `,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -42],
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
  const navigate = useNavigate();
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
      const m = L.marker([w.latitude, w.longitude], { icon: buildWorkerIcon(w.profession) });
      const initials = w.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
      const pinSvg = getProfessionSvg(w.profession);
      const distanceHtml =
        w.distanceKm !== undefined
          ? `<span class="wm-chip">${w.distanceKm.toFixed(2)} km</span>`
          : "";
      const professionHtml = w.profession
        ? `<span class="wm-prof">${w.profession}</span><span class="wm-dot">·</span>`
        : "";
      const clickable = w.linkToProfile !== false;
      m.bindPopup(
        `<div class="wm-card${clickable ? ' wm-card-clickable' : ''}" data-worker-link="${w.id}">
          <div class="wm-pin"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${pinSvg}</svg></div>
          <div class="wm-row">
            <span class="wm-name">${w.name}</span>
            <span class="wm-dot">·</span>
            ${professionHtml}
            ${distanceHtml}
          </div>
        </div>`,
        { className: "wm-popup", closeButton: false, offset: [0, -4] }
      );
      if (clickable) {
        m.on("popupopen", (e: any) => {
          e.popup.getElement()?.querySelector(`[data-worker-link="${w.id}"]`)
            ?.addEventListener("click", () => navigate(`/worker/${w.id}`));
        });
      }
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
        .wm-popup .leaflet-popup-content-wrapper { border-radius: 16px; padding: 0; box-shadow: 0 18px 40px -16px hsl(var(--hero) / 0.55); border: none; background: transparent; overflow: visible; }
        .wm-popup .leaflet-popup-content { margin: 0; font-weight: 400; width: auto !important; }
        .wm-popup .leaflet-popup-tip { background: hsl(var(--hero)); box-shadow: 0 4px 10px -4px hsl(var(--hero) / 0.5); }
        .wm-card { position: relative; padding: 6px 10px 6px 6px; display: inline-flex; align-items: center; gap: 8px; background: hsl(var(--hero)); color: hsl(var(--hero-foreground)); border-radius: 10px; overflow: hidden; font-family: 'Inter', system-ui, sans-serif; box-shadow: inset 0 0 0 1px hsl(0 0% 100% / 0.1); white-space: nowrap; }
        .wm-card::before { content: ""; position: absolute; inset: 0; opacity: 0.08; background-image: radial-gradient(hsl(var(--hero-foreground)) 1px, transparent 1px); background-size: 10px 10px; pointer-events: none; }
        .wm-card-clickable { cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
        .wm-card-clickable:hover { transform: translateY(-1px); box-shadow: inset 0 0 0 1px hsl(0 0% 100% / 0.2); }
        .wm-pin { position: relative; width: 22px; height: 22px; border-radius: 6px; background: hsl(0 0% 100% / 0.1); color: hsl(var(--primary)); display: grid; place-items: center; flex-shrink: 0; }
        .wm-row { position: relative; display: inline-flex; align-items: center; gap: 6px; line-height: 1; }
        .wm-name { font-size: 12px; font-weight: 700; letter-spacing: -0.01em; color: hsl(var(--hero-foreground)); }
        .wm-prof { font-size: 11px; font-weight: 500; color: hsl(var(--hero-muted)); }
        .wm-dot { font-size: 11px; color: hsl(var(--hero-muted)); opacity: 0.6; }
        .wm-chip { position: relative; padding: 2px 6px; border-radius: 9999px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
      `}</style>
    </div>
  );
};

export default WorkersMap;
