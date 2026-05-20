
# Geo-Targeted Ads System (Sparks)

Built into the existing Vite/React + Supabase app. PostGIS-backed geo-fencing. Admin-granted Sparks. Auto-launch on campaign create.

## 1. Where ads appear

Three homepage sections become **ad-only**:
- **Top Rated Providers** — promoted workers, sorted by rating then priority
- **5 KM** — promoted workers whose campaign geo-fence contains the viewer
- **10 KM** — same, with 10 km radius targeting
- **15 KM** — same, with 15 km radius targeting

Normal worker cards are removed from these ad carousels. They keep showing in the rest of Home/Discover. Promoted cards reuse the existing `WorkerAdCard` look with a "Promoted" ribbon.

## 2. Database (PostGIS)

Enable `postgis`. New tables:

- `ad_campaigns` — `id, worker_id, ad_type ('local'|'international'), status ('active'|'paused'|'expired'|'rejected'), duration_days, starts_at, ends_at, sparks_cost, priority, created_at`
- `ad_geo_targets` — `id, campaign_id, center geography(Point,4326), radius_km, country, city, area` (1:1 with campaign; `geography` enables `ST_DWithin` in meters)
- `ad_impressions` — `id, campaign_id, viewer_user_id, viewer_point geography, placement, created_at`
- `ad_clicks` — same shape as impressions
- `sparks_wallets` — `worker_id PK, balance int, updated_at`
- `sparks_transactions` — `id, worker_id, delta, reason ('admin_grant'|'campaign_spend'|'refund'), campaign_id, created_at`
- `ad_pricing_rules` — `id, key, value jsonb, active`

Radius options for Local ads: **5 / 10 / 15 km**.

Indexes: GIST on `ad_geo_targets.center`, btree on `(status, ends_at)`, `(campaign_id, created_at)`.

RPC functions:
- `get_promoted_workers(viewer_lat, viewer_lng, radius_km, limit)` — joins active campaigns + geo targets, filters with `ST_DWithin(center, viewer, radius_m)` AND `radius_km >= distance`, orders by rating/priority/distance.
- `get_top_rated_promoted(viewer_lat, viewer_lng, limit)` — same but no radius filter on viewer side; still must include viewer in each campaign's own fence.
- `calc_sparks_cost(ad_type, radius_km, duration_days, scope jsonb)` — reads `ad_pricing_rules`, returns int. Initial formula stub: `base * radius_factor * duration_factor * type_factor`; admin-tunable.
- `spend_sparks(worker_id, amount, campaign_id)` — atomic balance check + debit + transaction row.
- `expire_campaigns()` — cron-run; flips `status` to `expired` where `ends_at < now()`.

## 3. RLS

- `ad_campaigns`: worker owns own; admin all; public reads only active+in-window via security-definer RPCs.
- `ad_geo_targets`: gated via campaign ownership.
- `ad_impressions`/`ad_clicks`: anyone INSERT (validated); owner/admin SELECT.
- `sparks_wallets`/`sparks_transactions`: owner + admin SELECT; mutations only via security-definer RPCs.
- `ad_pricing_rules`: public SELECT (for preview), admin write.

Anti-spoofing: distance recomputed server-side in RPC from passed viewer coords; impressions store the point for audit. Rate-limit impressions per `(campaign_id, viewer_user_id, hour)` via partial unique index.

## 4. Worker Ads Dashboard

New route `/worker/ads` (worker role only):

1. **Campaigns** — list with status pills, pause/resume, end date, spent Sparks, impressions/clicks/CTR.
2. **Create Campaign** wizard:
   - Step 1: Ad Type (Local / International)
   - Step 2 (Local): live GPS center + radius chips **5 / 10 / 15 km** on a Leaflet map with circle overlay
   - Step 2 (Intl): Country → City → Area + radius, map preview
   - Step 3: Duration chips (1 / 7 / 15 / 30 days)
   - Step 4: Live Sparks cost (`calc_sparks_cost` on each change) + wallet balance check
   - Step 5: Live `WorkerAdCard` preview with "Promoted" ribbon
   - Launch → `spend_sparks` + insert campaign + geo target in one RPC, status `active`
3. **Analytics** — impressions, clicks, CTR, reach, per-campaign + per-day chart (Recharts), remaining Sparks.

Pause/Resume toggles `status`. Expired campaigns read-only.

## 5. Homepage integration

`useWorkers` stays for non-ad sections. New hooks:
- `usePromotedNearby(radiusKm)` → `get_promoted_workers` with `useRealtimeLocation` coords.
- `usePromotedTopRated()` → `get_top_rated_promoted`.

`Home.tsx` carousels for Top Rated / 5km / 10km / 15km swap to these hooks. Empty state: "No promoted providers in your area yet." Impressions via `IntersectionObserver` (reuse `useAdTracking` pattern); clicks fire on contact/view.

## 6. Admin panel

Extend `AdminDashboard` with an **Ads** tab:
- Campaigns table (filter by status, search worker) with force-pause / disable / refund Sparks.
- Sparks: grant balance to any worker, view transaction log.
- Pricing rules editor (key/value JSON) with live cost calculator.
- Global analytics: top campaigns, total impressions.

## 7. Cron

`pg_cron` every 15 min → `expire_campaigns()`.

## 8. Performance

- GIST index drives `ST_DWithin` in single-digit ms at 100k campaigns.
- React Query cache for promoted lists (60s stale).
- Impression dedupe via session `Set` + DB partial unique on hour bucket.

## Out of scope (later)

- Stripe Sparks top-up
- Admin approval queue
- Heatmaps, A/B variants

## Technical notes

- Stack: existing Vite/React + Tailwind + shadcn + Supabase. No Next.js.
- Migrations: enable `postgis`, create tables/indexes/RPCs/RLS in one migration. Seed `ad_pricing_rules` with placeholder values.
- New files: `src/pages/worker/AdsDashboard.tsx`, `src/components/ads/CampaignWizard.tsx`, `src/components/ads/CampaignCard.tsx`, `src/components/ads/GeoTargetMap.tsx`, `src/components/ads/SparksCostBar.tsx`, `src/hooks/usePromoted.ts`, `src/hooks/useSparks.ts`, `src/hooks/useAdCampaigns.ts`, `src/components/admin/AdsCampaignsTab.tsx`, `src/components/admin/SparksTab.tsx`, `src/components/admin/PricingRulesTab.tsx`.
- Changed: `src/pages/Home.tsx` (5/10/15 km ad carousels), `src/components/WorkerAdCard.tsx` (Promoted variant + click tracking), `src/App.tsx` routes, nav components for worker Ads link.

Ship in 2 batches: (A) DB + worker dashboard + homepage swap, (B) admin panel + analytics charts.
