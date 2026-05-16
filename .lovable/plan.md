# Show place names instead of coordinates

Yes — replace raw `lat, lng` strings with a human-readable place name via reverse geocoding.

## Approach

1. **Add a tiny helper** `src/lib/reverseGeocode.ts`
   - `reverseGeocode(lat, lng): Promise<string>` using free OpenStreetMap Nominatim (`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=..&lon=..&zoom=14`).
   - Returns a short label like `"Gulshan-e-Iqbal, Karachi"` built from `address.suburb / city / town / village / state / country`.
   - In-memory cache + `localStorage` cache keyed by rounded coords (5 decimals) so we don't hit the API repeatedly.
   - Graceful fallback to `lat.toFixed(3), lng.toFixed(3)` on failure/offline.

2. **Add a reusable component** `src/components/LocationLabel.tsx`
   - Props: `latitude`, `longitude`, optional `fallback`, `className`, `iconClassName`.
   - Internally uses the helper, shows a small skeleton ("Locating…") while loading, then the resolved name.

3. **Swap coordinate displays** to use `<LocationLabel />`:
   - `src/pages/WorkerDashboard.tsx` — the locked location chip (`{lat.toFixed(3)},{lng.toFixed(3)}`).
   - `src/components/MapLocationPicker.tsx` — "Selected: x, y" line under the map.
   - `src/components/admin/LocationChangeRequestsTab.tsx` — both "Current" and "Requested" rows.
   - Any other spots that print raw coordinates (Worker cards / profile popups if present) — quick grep for `toFixed(` in `src/`.

4. **Keep raw coords accessible** as a tooltip / `title` attribute on the label so admins can still see exact values on hover.

## Notes / trade-offs

- Nominatim is free but rate-limited (1 req/sec, must send a `User-Agent`/referer). With the cache this is fine for typical app usage.
- If you'd rather use a paid/faster provider (Google, Mapbox), swap the helper's implementation — the rest of the code stays the same.
- No DB changes; resolution happens client-side and is cached.
