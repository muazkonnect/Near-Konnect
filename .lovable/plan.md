

## Goal
Make Blood Konnect privacy-first and proximity-aware:
1. Hide donor counts and donor contact info publicly.
2. Donors only get contacted via in-app chat OR a contact-reveal request flow (same pattern as workers).
3. Urgent/critical blood requests are pushed to nearby donors based on real-time geolocation, with one-tap chat.

## UX Flow

### Donor side (privacy)
- Public Blood Donors page no longer shows phone/email or total donor count.
- Each donor card shows: name, blood group, city, last-active, "Message" button, "Request Contact" button.
- Contact info only appears after the donor approves a contact-reveal request (mirrors worker flow).

### Requester side
- "Request Blood" dialog gains an **urgency** selector (normal / urgent / critical) — already in schema.
- On submit with `urgent` or `critical`, the request is broadcast to **nearby matching donors** (same blood group or compatible, within radius based on requester's geolocation).
- Nearby donors get a high-priority push + in-app notification with a "Help Now" button → opens chat with requester.

### Donor notifications (Blood Konnect page)
- Top banner: "Incoming requests for you" — lists pending blood requests matching donor's blood group, sorted by distance + urgency.
- Each item: requester name, distance, urgency badge, message, [Message] [Share Contact].

## Plan

### 1. Database (migration)
- Add `latitude`, `longitude` columns to `blood_requests` (double precision, nullable).
- Add `latitude`, `longitude` to `profiles` (for donor location; nullable). Already have `city`.
- Create RPC `get_nearby_blood_donors(req_lat, req_lng, blood_group, radius_km)` — security definer, returns donor `user_id`, `full_name`, `city`, `distance_km`. Excludes contact fields.
- Reuse existing `contact_reveals` table for blood-donor contact requests (no schema change — `worker_user_id` is just "the person being asked"; we'll keep using it for donors too).
- Create RPC `get_nearby_blood_requests(donor_lat, donor_lng, blood_group, radius_km)` — returns open requests near donor matching their blood group, with distance.

### 2. Frontend changes

**`src/pages/BloodDonors.tsx`**
- Remove donor count displays.
- Remove direct phone/email rendering on cards.
- Add "Message" and "Request Contact" buttons on each donor card.
- Add "Incoming requests for you" section at top (only for users who are donors) — shows nearby matching requests using new RPC, sorted by urgency then distance.

**`src/components/BloodDonationCard.tsx`**
- Strip phone/whatsapp display.
- Add Message → `/chat/{donor_user_id}`.
- Add Request Contact → reuse existing `useContactReveal` hook against `contact_reveals`.
- Show revealed contact methods only when reveal status = `approved`.

**`src/components/BloodDonationBanner.tsx`** & **`ActiveBloodRequests.tsx`**
- Remove "donors count" stat.
- Keep "active requests" count (already public info per RLS).

**`src/components/BloodRequestDialog.tsx`**
- On submit, capture user's geolocation (browser API) and store `latitude`/`longitude` on the request.
- Keep urgency selector.
- After insert, if urgency is `urgent`/`critical`, call edge function `notify-nearby-donors`.

**`src/hooks/useNotifications.tsx`**
- Update blood-request realtime listener to: only notify if donor blood group matches AND donor is within X km of request (using donor's own stored location vs request lat/lng).
- For `critical`/`urgent`, show toast with stronger styling + sound (already partly there).

### 3. Edge function `notify-nearby-donors` (new)
- Trigger: called from client right after creating an urgent/critical blood request.
- Logic: query donors via `get_nearby_blood_donors`, send push notification (reuse `send-push` function) to each.

### 4. Donor location capture
- On Blood Donors page mount (if user is a donor), prompt once for geolocation permission and persist `latitude`/`longitude` to their `profiles` row.
- Add a small "Update my location" button on the donor's own card section.

## Technical Notes
- Distance computed via Haversine formula in SQL RPCs.
- Default radius: 25 km for nearby requests, 15 km for nearby donors (configurable constants).
- All contact info access goes through existing `contact_reveals` flow — same RLS already in place.
- No new tables required besides the two RPCs and column additions.

## Files to change
- New migration: add lat/lng columns + 2 RPCs.
- New: `supabase/functions/notify-nearby-donors/index.ts`
- Edit: `src/pages/BloodDonors.tsx`, `src/components/BloodDonationCard.tsx`, `src/components/BloodDonationBanner.tsx`, `src/components/ActiveBloodRequests.tsx`, `src/components/BloodRequestDialog.tsx`, `src/hooks/useNotifications.tsx`

