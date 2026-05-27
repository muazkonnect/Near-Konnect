// Singleton loader for the Google Maps JavaScript API.
// Uses Lovable's managed Google Maps connector browser key.

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let loadPromise: Promise<typeof google> | null = null;

declare global {
  interface Window {
    __lovableGmapsInit?: () => void;
    google: typeof google;
  }
}

export const isGoogleMapsConfigured = () => !!BROWSER_KEY;

export const loadGoogleMaps = (): Promise<typeof google> => {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (!BROWSER_KEY) return Promise.reject(new Error("Google Maps browser key missing"));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    window.__lovableGmapsInit = () => resolve(window.google);
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      loading: "async",
      libraries: "places,marker",
      callback: "__lovableGmapsInit",
      v: "weekly",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(s);
  });
  return loadPromise;
};
