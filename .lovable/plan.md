

## Animated splash: favicon → full logo

Morph the splash from the favicon mark into the full NearKonnect logo, then fade out as React mounts. Pure CSS, no new dependencies, no extra network requests (both SVGs already loaded by the app).

### Sequence (~1.4s total)

```text
0ms       400ms          900ms              1400ms
│          │              │                  │
│ favicon  │  crossfade   │  full logo       │  splash fades
│  pops in │  favicon →   │  settles +       │  → React app
│          │  full logo   │  glow pulse      │
```

### Files changed (2, no new deps)

**`index.html`**
- Replace splash inner markup with two stacked, absolutely-centered `<img>`s: `#splash-mark` (`/favicon.svg`) and `#splash-full` (`/src/assets/logo.svg` via public path or inline reference).
- Add keyframes: `splash-mark-in` (0→400ms scale 0.6→1 + fade), `splash-mark-out` (400→900ms fade + scale 1→1.15), `splash-full-in` (400→900ms fade + scale 1.15→1), `splash-glow` (900ms+ subtle pulse on spinner ring).
- Keep dark dotted background, spinner ring, and existing `is-hidden` fade transition.
- `prefers-reduced-motion`: skip morph, show full logo immediately, no pulse.

**`src/main.tsx`**
- Bump splash hide delay `350ms` → `1400ms` so the morph completes before fade-out.

### Performance

| Aspect | Impact |
|---|---|
| Network | None — both SVGs already in app |
| JS bundle | None — pure CSS |
| Paint | Compositor-only (transform + opacity) |
| TTI | None — splash overlays while React hydrates in parallel |

### Note on logo path

`logo.svg` currently lives in `src/assets/`. For the splash to load it without a JS bundle, I'll either (a) copy it to `/public/logo.svg` so `index.html` can reference it directly, or (b) inline the SVG markup into `index.html`. I'll go with **(a) copy to `/public/logo.svg`** — cleaner, cacheable, reusable elsewhere.

