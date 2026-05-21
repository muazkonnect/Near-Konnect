# Verified Badge + Featured Worker Systems

Two Sparks-powered premium systems integrated with wallet, geo targeting, discovery, explore, and admin panel.

---

## 1. Database (one migration)

### New tables

- **`worker_verifications`** — one row per worker
  - `worker_id` (unique), `user_id`, `status` (`none`/`submitted`/`approved`/`rejected`/`resubmit`)
  - `persona_inquiry_id`, `persona_session_token`, `persona_status`, `persona_payload` (jsonb, admin-only)
  - `sparks_cost`, `sparks_transaction_id`
  - `submitted_at`, `decided_at`, `decided_by`, `admin_note`
  - `verified_at` (set on approve — drives the lifetime badge)

- **`verification_documents`** — private references only
  - `verification_id`, `kind` (`id_front`/`id_back`/`selfie`/`other`), `storage_path`, `persona_file_id`, `created_at`
  - Storage bucket **`verification-docs`** (private). RLS: owner upload to own folder, admin read all.

- **`featured_workers`** — active/past featured listings
  - `worker_id`, `user_id`, `category_id` (nullable = all), `duration_days`, `sparks_cost`
  - `starts_at`, `ends_at`, `status` (`active`/`expired`/`cancelled`/`refunded`)
  - `center` geography point (worker location at purchase), fixed `radius_km = 3`
  - `sparks_transaction_id`

- **`featured_pricing_rules`** — admin-editable
  - `duration_days` (1/7/15/30), `base_sparks`, `category_id` (nullable for global), `multiplier`, `active`

- **`verification_settings`** — single row
  - `sparks_cost`, `persona_template_id`, `persona_environment_id`, `enabled`, `auto_approve_on_persona_pass` (bool, default false)

### RPCs (SECURITY DEFINER)

- `start_verification()` — creates pending `worker_verifications` row, returns it; no Sparks yet.
- `submit_verification(p_inquiry_id, p_session_token)` — debits Sparks via `spend_sparks` with reason `verification`, sets status `submitted`.
- `admin_decide_verification(p_id, p_status, p_note)` — approve/reject/resubmit; on approve sets `verified_at = now()` and updates `workers.verified = true`.
- `admin_revoke_verification(p_worker_id, p_note)` — sets `workers.verified = false`, status `rejected`.
- `purchase_featured(p_duration_days, p_category_id)` — looks up price from `featured_pricing_rules`, debits via `spend_sparks` (reason `featured`), inserts `featured_workers` with worker geo + 3 km, `ends_at = now()+duration`.
- `expire_featured_workers()` — sets expired rows to `status = 'expired'`; called by cron.
- `nearby_featured_workers(p_lat, p_lng, p_category_id)` — returns active featured within 3 km of viewer, ordered by category match first then distance.

### Triggers / cron
- pg_cron: `expire_featured_workers()` every 5 min.

### RLS summary
- `worker_verifications`: user select/insert own (via RPC), admin all. `persona_payload` hidden from non-admin via a view `worker_verifications_public` exposing only `status`, `verified_at`.
- `verification_documents`: owner select own, admin all.
- `featured_workers`: public select where `status='active' AND now() between starts_at and ends_at`; owner select own; admin all.
- `featured_pricing_rules`, `verification_settings`: public select where active; admin write.

---

## 2. Edge Functions

- **`persona-create-inquiry`** — calls Persona API with `PERSONA_API_KEY` (placeholder secret to be added later), template/env from `verification_settings`. Returns `inquiry_id` + session token to client. If `PERSONA_API_KEY` missing → returns a clearly-marked mock inquiry so the flow is testable end-to-end.
- **`persona-webhook`** — verifies signature (`PERSONA_WEBHOOK_SECRET`), updates `worker_verifications.persona_status` + `persona_payload`. If `auto_approve_on_persona_pass` is true and status = `completed`/`approved`, calls `admin_decide_verification` with service role.
- Both registered in `supabase/config.toml` with `verify_jwt = false` for the webhook only.

---

## 3. Frontend

### Services / hooks
- `src/services/verificationService.ts` — start/submit/fetch verification, upload doc to private bucket.
- `src/services/featuredService.ts` — pricing fetch, purchase, my-featured list, nearby fetch wrapper.
- `src/hooks/useVerification.ts`, `src/hooks/useFeaturedWorker.ts`, `src/hooks/useNearbyFeatured.ts`.

### Worker-facing UI
- `src/components/verification/VerificationDialog.tsx` — multi-step: intro + price → Persona inquiry launch (uses `persona-create-inquiry` edge function and Persona web SDK loaded dynamically; if key missing, shows "Demo mode" with manual fake-submit) → success state.
- `src/components/featured/FeaturedPurchaseDialog.tsx` — duration cards (1/7/15/30) with live Sparks price + balance check → confirm → success.
- Entry points in **Worker Dashboard**: two new cards "Get Verified" and "Become Featured".

### Display integration
- `VerifiedBadge` already exists; ensure it reads `workers.verified` and is shown on:
  - `WorkerCard`, `WorkerProfilePopup`, `WorkerAdCard`, `FeaturedWorkersCarousel`, ads cards on Home, Explore/Discover.
- **Featured cards** — new `FeaturedWorkerCard.tsx` with subtle gold/accent ring, "Featured" pill, no aggressive ad styling.
- **Explore/Discover ordering** (update `Discover.tsx`): `[ Sponsored Ads ] → [ Featured Workers (3 km, category match) ] → [ Normal workers ]`. Featured fetched via `nearby_featured_workers` RPC. Same ordering applied to category-filtered views.

### Admin panel (Settings tab — extends existing structure)
- New sub-tabs in `SettingsTab`:
  - **Verification** — queue (pending/submitted), approve/reject/resubmit with note, view documents via signed URLs, edit `sparks_cost` + Persona template/env + auto-approve toggle.
  - **Featured** — active listings table (worker, category, days left, ends_at, cancel/refund), pricing rules CRUD (duration × category × sparks).
- Reuses existing `has_role('admin')` gating.

---

## 4. Sparks integration

- All deductions go through existing `spend_sparks` RPC with new reasons `verification`, `featured`. No direct balance writes.
- Insufficient balance → toast + CTA to `/wallet/buy`.
- `sparks_transactions.reason` enum extended.

---

## 5. Security

- Persona payload + documents are admin-only (RLS + private storage bucket).
- Verification + featured activation only mutate via SECURITY DEFINER RPCs.
- `workers.verified` only writable by RPC (revoke existing public update policy if any; add restriction).
- Webhook signature verification mandatory; rejects unsigned calls.

---

## 6. Secrets needed later (placeholder now)

- `PERSONA_API_KEY`
- `PERSONA_WEBHOOK_SECRET`
- `PERSONA_TEMPLATE_ID` (also editable via admin)

Edge functions will read these via `Deno.env.get` and degrade to demo mode if absent, so the rest of the system is fully functional today.

---

## Order of execution

1. Migration (tables, RPCs, storage bucket, RLS, pricing seed, cron).
2. Edge functions (`persona-create-inquiry`, `persona-webhook`).
3. Services + hooks.
4. Worker dialogs (verification + featured purchase) and Worker Dashboard entry points.
5. Display: `FeaturedWorkerCard`, Explore/Discover ordering, badge audit across cards.
6. Admin sub-tabs in Settings (Verification queue, Featured management, pricing).
7. Wire Sparks reasons; verify end-to-end in preview.
