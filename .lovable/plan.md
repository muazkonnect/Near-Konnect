# Performance fixes

## 1. Pause ticker when off-screen / reduced motion

**File:** `src/pages/Home.tsx` (announcement ticker)

- Wrap the ticker element with a `ref` and an `IntersectionObserver` that toggles an `isVisible` state.
- Detect `window.matchMedia('(prefers-reduced-motion: reduce)')` once into `prefersReducedMotion`.
- Replace the inline `animation` style with a conditional: when `!isVisible || prefersReducedMotion` set `animationPlayState: 'paused'` (keep the animation declaration so resuming is instant). When reduced motion is on, also drop the transform entirely.

## 2. Pause featured carousel when off-screen / reduced motion

**File:** `src/components/FeaturedWorkersCarousel.tsx`

- Add a wrapper `ref` + `IntersectionObserver` → `isVisible` state.
- Read `prefers-reduced-motion`.
- Pass a new `paused` prop to `SteppedCarousel` = `!isVisible || prefersReducedMotion`.
- In `SteppedCarousel`, short-circuit the dwell `setInterval` / step advance when `paused` is true (skip scheduling, clear existing timer on pause). When reduced motion, also set transition duration to 0.

## 3. Lazy-load push notifications after first interaction

**Files:** wherever `src/lib/pushNotifications.ts` is currently imported at boot (likely `src/main.tsx` or `src/App.tsx` — confirm during build).

- Remove the top-level static import.
- In a root `useEffect`, attach one-shot listeners for `pointerdown`, `keydown`, `touchstart` (with `{ once: true, passive: true }`) that `await import('@/lib/pushNotifications')` then invoke its init function.
- Also schedule a fallback `requestIdleCallback` (with `setTimeout` fallback, ~4s) so the module still loads on idle pages that never get interaction.

## Technical notes

- Single shared `useIsVisible(ref)` hook in `src/hooks/useIsVisible.ts` to avoid duplicating IntersectionObserver logic between ticker and carousel. Threshold `0.01`, disconnect on unmount.
- `prefers-reduced-motion` read via a tiny `useReducedMotion()` hook with `matchMedia` + `change` listener.
- No backend, schema, or settings changes. Admin speed controls keep working unchanged.
- No visible UI change when section is on-screen and motion is allowed.
