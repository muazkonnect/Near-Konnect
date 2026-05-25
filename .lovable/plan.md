## Job Request Ticker Bar

Add a second ticker bar below the top announcement bar that shows live "Need a [subcategory]" job requests from nearby verified clients, claimable by premium/featured workers only.

### User flow

**Client (verified only):**
- "Post a quick job" button on homepage (and in the ticker area)
- Dialog: pick Main Category → Sub Category → optional short note
- Posted job appears in the ticker for workers within 5 km
- When a worker claims it, client gets redirected/notified in chat

**Worker (premium/featured only):**
- Sees ticker "Need a Plumber • 1.2km away"
- Clicks → claims job (free for now, will cost 1 spark later)
- Redirected to chat with the client

**Admin:**
- New "Job Requests" tab in Admin Dashboard
- View all jobs (filter by status, location)
- Toggle feature on/off
- Set radius (default 5 km), set spark cost (default 0, future 1)
- Set "verified client required" and "premium worker required" flags
- Delete/close any job
- View claim history

### Technical changes

**Database (new table `job_requests`):**
- `id`, `client_user_id`, `category_id`, `subcategory_id`, `subcategory_name` (cached), `note`, `latitude`, `longitude`, `status` (open/claimed/closed/expired), `claimed_by_user_id`, `claimed_at`, `expires_at` (default now + 2h), `sparks_cost`, `created_at`, `updated_at`
- RLS:
  - SELECT: any authenticated user (filter by distance client-side); admins always
  - INSERT: authenticated + verified client (check via `has_role` / verification status), `client_user_id = auth.uid()`
  - UPDATE (claim): authenticated + premium/featured worker, only when `status='open'`, sets `claimed_by_user_id = auth.uid()`
  - UPDATE/DELETE (close): owner or admin
- Indexes on `status`, `created_at`, geo
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.job_requests`

**App settings keys** (in existing `app_settings`):
- `job_requests.enabled` (bool, default true)
- `job_requests.radius_km` (int, default 5)
- `job_requests.client_post_cost` (int, default 0)
- `job_requests.worker_claim_cost` (int, default 0)
- `job_requests.require_verified_client` (bool, default true)
- `job_requests.require_premium_worker` (bool, default true)
- `job_requests.expiry_minutes` (int, default 120)

**Helper functions (SQL):**
- `is_premium_or_featured_worker(uid uuid)` — checks active `featured_workers` row
- `is_verified_client(uid uuid)` — checks verification table

**Frontend:**
- `src/components/JobRequestTicker.tsx` — horizontal scrolling marquee below the existing top ticker; pulls open jobs within radius using user's location; realtime subscribe
- `src/components/PostJobRequestDialog.tsx` — Main/Sub category pickers + note
- `src/hooks/useJobRequests.ts` — list + create + claim + distance filter
- Mount `<JobRequestTicker />` in `AppLayout` right under the existing announcement bar
- On claim: navigate to `/chat?with=<client_user_id>&job=<id>` and seed a first message

**Admin:**
- `src/components/admin/JobRequestsTab.tsx` — list, filters, delete/close, settings panel for the keys above
- Register in `AdminDashboard.tsx`

### Out of scope (now)
- Actual spark deduction (kept free; cost columns + settings ready to flip on)
- Push notifications to workers (can be added later)

Confirm and I'll implement.