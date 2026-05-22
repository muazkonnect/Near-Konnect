# Pre-launch readiness — findings & plan

## Status snapshot
- **Cloud backend:** healthy ✅
- **Security scan:** 150 findings — **1 ERROR**, rest warnings
- **DB linter:** 144 issues (same set)

## Critical (must fix before launch)

1. **RLS Disabled on a public table** — 1 ERROR
   - A table in `public` schema is exposed via PostgREST with **no RLS**. Anyone with the anon key can read/write it. This is the single biggest blocker for Play Store / production.
   - Action: enable RLS + add proper policies on that table.

2. **`capacitor.config.ts` still points at lovableproject.com**
   - The `server.url` hot-reload entry must be removed (or wrapped in a dev-only flag) before generating the release AAB, otherwise the installed app loads from the sandbox instead of bundled `/dist`.

3. **Privacy Policy URL** (Play Store requirement)
   - Required because the app uses auth + FCM. Need a hosted page (can be a route in the app).

## High-priority warnings to fix

4. **Function `search_path` mutable** (8 functions)
   - All `SECURITY DEFINER` functions need `SET search_path = public` to prevent search-path hijacking.

5. **Public Can Execute SECURITY DEFINER Function** (many)
   - Anon role can call internal helper functions. Revoke `EXECUTE FROM anon, public` on functions that aren't meant to be called from the client (`has_role`, trigger helpers, etc.).

6. **Public Storage Buckets allow listing** (3 buckets)
   - Anon can `LIST` all files in public buckets. Restrict the storage.objects SELECT policy to authenticated owners (or specific prefixes).

7. **Extension in public schema** — move `pgcrypto`/similar to `extensions` schema (cosmetic but flagged).

## Recommended additions (not blockers)

- Enable **HIBP leaked-password check** in Auth settings.
- Add **email confirmation** if not already on.
- Add **app icon + splash + version code/name** in `android/app`.
- Generate **release keystore** and configure `signingConfigs.release` in `android/app/build.gradle`.
- Set `android:usesCleartextTraffic="false"` in `AndroidManifest.xml`.
- Verify Google OAuth redirect URIs include the prod web domain and the `com.nearkonnect.app://` scheme.
- Test one real FCM push to a device with the bundled APK.

## What I'll do if you approve

**Step A — DB hardening migration (single migration)**
- Identify the RLS-less table and enable RLS + add owner-scoped policies (need to confirm which table — will inspect schema first).
- Add `SET search_path = public` to all 8 SECURITY DEFINER functions.
- `REVOKE EXECUTE … FROM anon, public` on internal helper functions; keep grants only on functions intentionally callable from the client.
- Tighten storage.objects SELECT policy on the 3 public buckets (owner-prefix scoping).

**Step B — Capacitor production switch**
- Update `capacitor.config.ts` so `server.url` is only used in dev (`process.env.NODE_ENV !== 'production'`), so release builds load `/dist`.

**Step C — Auth hardening**
- Enable `password_hibp_enabled: true`.

**Step D — Launch checklist doc**
- Write `LAUNCH_CHECKLIST.md` with the keystore + Play Store steps (icon, screenshots, privacy policy, data safety form, content rating, signing).

I will **not** touch app UI, business logic, or the working notification wiring.

## What I need from you

- Approve this plan to start.
- After Step A I'll show you exactly which table had RLS off so you can confirm the policy intent (e.g. "user-owned" vs "publicly readable").
