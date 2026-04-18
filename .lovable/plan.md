
Issue
- The crash is not coming from your worker/profile UI itself.
- It happens inside `react-leaflet` at `MapContainer -> Context.Consumer`, with `render2 is not a function`.
- Do I know what the issue is? Yes: this is a persistent `react-leaflet` runtime/dependency-state mismatch, likely made worse by mixed dependency state (`package.json`/`bun.lock` include `react-leaflet`, while `package-lock.json` is inconsistent), so retrying small UI tweaks will not solve it.

Plan
1. Remove the fragile layer causing the crash
- Replace `react-leaflet` usage with plain `leaflet` initialized imperatively in `useEffect`.
- This avoids the broken React context path entirely while keeping the same map behavior.

2. Rebuild `WorkersMap` without `react-leaflet`
- Keep the same public props so pages using it do not need major changes.
- Use a container `div` + `L.map(...)`.
- Add worker marker(s), optional user marker, popups, fit-bounds, resize/orientation handling, and mobile-safe sizing.
- Preserve current styling and mobile-friendly presentation.

3. Rebuild `MapLocationPicker` without `react-leaflet`
- Use plain Leaflet with click-to-set-pin behavior.
- Keep `value` and `onChange` API unchanged.
- Preserve “Use my current location” and selected coordinates text.
- This prevents the same crash on registration/profile flows too.

4. Clean up dependency drift
- Remove `react-leaflet` from `package.json`.
- Regenerate the lockfile(s) so dependency state is consistent.
- Keep `leaflet` only.

5. Verify all affected pages
- Worker profile page
- Discover page
- Worker dashboard profile tab
- Register page / fixed-location picker
- Confirm no more `render2` / `r is not a function` errors and confirm mobile map layout no longer overlaps UI.

Files to update
- `src/components/WorkersMap.tsx`
- `src/components/MapLocationPicker.tsx`
- `package.json`
- lockfile(s): `package-lock.json` and/or `bun.lock`
- possibly small CSS touch-ups in `src/index.css` only if needed after the component rewrite

Why this approach
- It is a fundamentally different fix, not another cache guess.
- It keeps your current product behavior with minimal page-level changes.
- It removes the exact library integration layer shown in the error stack.

Expected result
- The page should stop crashing.
- Maps should render on mobile and desktop.
- Fixed worker location remains visible and immutable.
- Registration location picking still works.
