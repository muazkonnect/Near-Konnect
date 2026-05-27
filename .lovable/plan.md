## Goal
Replace Leaflet + OpenStreetMap/Nominatim with **Google Maps Platform** (managed Lovable connector) across the location picker and the workers map, so area search actually finds the place you want.

## Setup
1. Connect the **Google Maps Platform** connector to the project (managed key — works on `*.lovable.app` and `*.lovableproject.com` out of the box).
2. This injects:
   - `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` (referrer-restricted, safe for the browser)
   - `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID`
   - Server-side `GOOGLE_MAPS_API_KEY` for any edge functions (not needed for this change).
3. Note for later: when you publish to a **custom domain**, you'll need your own Google Cloud API key (Maps JS + Places API New enabled, billing on, custom domain in the HTTP referrer allowlist). The managed key only covers Lovable domains.

## Files to change

**New: `src/components/maps/useGoogleMaps.ts`**
- Small singleton loader that injects the Google Maps JS script once with `loading=async&callback=...&libraries=places&channel=<tracking-id>`.
- Returns a `ready` promise so components can `await` the API.
- Guards against double-load and missing browser key (renders a friendly fallback instead of a blank map).

**Replace: `src/components/MapLocationPicker.tsx`**
- Drop Leaflet + Nominatim.
- Render a `google.maps.Map` (no `mapId`, no AdvancedMarker — per Lovable Google Maps rules).
- Single `google.maps.Marker` that follows the selected coords; map click drops the pin.
- Search box uses **Places API (New)** `AutocompleteSuggestion.fetchAutocompleteSuggestions()` with a session token (debounced, abortable). Picking a suggestion calls `Place.fetchFields(['location','formattedAddress'])` to get coords.
- "Use my current location" button: unchanged (still uses `getCurrentPosition`).
- Optional radius circle: `google.maps.Circle` using the same `radiusKm` prop, with `fitBounds`.
- Public props (`value`, `onChange`, `radiusKm`) stay identical, so `MapLocationPickerLazy` and all callers keep working with zero changes.

**Replace: `src/components/WorkersMap.tsx`**
- Render `google.maps.Map` with the same Carto-style minimal look (use a lightweight `styles` array to keep the muted look — no `mapId` required).
- Replace Leaflet markers with `google.maps.Marker` per worker, using inline SVG `icon` built from the existing `PROFESSION_ICONS` map (keeps the black-pill profession pin look).
- Replace `L.divIcon` "you are here" with a small pulsing custom SVG marker.
- Replace `L.Popup` with `google.maps.InfoWindow` containing the same `.wm-card` HTML; reuse existing CSS (it's plain HTML/CSS, works inside InfoWindow).
- Keep `fitBounds` behavior, header chip ("X pins"), and outer hero shell exactly as today.
- Same props (`workers`, `userCoords`, `height`, `fitToWorkers`) — no caller changes.

**Remove**
- `leaflet` and `@types/leaflet` from `package.json` (no other usages — both files above are the only consumers).
- `import "leaflet/dist/leaflet.css"` lines.

## Out of scope (intentionally)
- Edge functions, RLS, worker discovery logic, distance calculations — all stay on existing code.
- No backend calls; everything runs through the browser key + Places JS library.
- No changes to `WorkerProfile`, `Discover` filters, or `WorkerDashboard`.

## Risks / things to watch
- Places API (New) is a paid product; the managed key has Lovable-side quotas. Heavy autocomplete typing without debounce can burn through it — the new picker debounces 300 ms and uses a session token (counts as one request per session).
- If the browser key env var is missing (e.g. connector not linked), both components render a clear "Map unavailable — connect Google Maps" placeholder rather than crashing.
- The managed key is referrer-locked; the `nearkonnectapp.lovable.app` domain works, custom domains will need their own key as noted above.

## Order of execution
1. Open the Google Maps connector picker (you'll click through to link it).
2. Add `useGoogleMaps` loader.
3. Rewrite `MapLocationPicker`.
4. Rewrite `WorkersMap`.
5. Remove Leaflet deps.
6. Smoke-test: onboarding location picker search → Discover map renders → click a worker pin.