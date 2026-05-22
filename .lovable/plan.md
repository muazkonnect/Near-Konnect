
## Goal
Extend the existing push-notification system to cover three new event groups, using the same `invoke_send_push` → `send-push` edge function pattern already wired for messages/bookings/blood/contact-reveal.

## New triggers (all via DB triggers, SECURITY DEFINER, search_path=public)

### 1. Wallet / Sparks transactions
**Trigger:** `push_on_payment_request_status` — `AFTER UPDATE OF status` on `payment_requests`
- `approved` → user: "Payment approved 🎉" / "{sparks_amount + bonus_sparks} Sparks added to your wallet" → `/wallet`
- `rejected` → user: "Payment rejected" / admin_note (if any) → `/wallet`
- `cancelled` → no push (user-initiated)

**Trigger:** `push_on_sparks_transaction` — `AFTER INSERT` on `sparks_transactions`
- Fires only for admin-initiated credit/debit (reason in `'admin_added'`, `'deduction'`) so users learn when an admin adjusts their balance manually. Skip `ad_spent`, `purchase` (already covered by payment_requests trigger), and refunds tied to a payment_request.
- Credit → "Sparks added" / "+{delta} Sparks" → `/wallet`
- Debit → "Sparks deducted" / "{delta} Sparks" + notes → `/wallet`

### 2. Featured-listing approvals
**Trigger:** `push_on_featured_request_status` — `AFTER UPDATE OF status` on `featured_requests`
- `approved` → user: "Featured listing approved ⭐" / "Your profile is now featured" → `/worker-dashboard`
- `rejected` → user: "Featured request declined" → `/worker-dashboard`

### 3. Verification status changes
Verification state lives on the `workers` table (verified flag + status fields). Confirm exact column during implementation by reading `workers` schema and `verificationService.ts`.

**Trigger:** `push_on_worker_verification` — `AFTER UPDATE OF verified` (or `verification_status`) on `workers`
- Verified=true / approved → "Verification approved ✅" / "You're now a verified worker" → `/worker-dashboard`
- Rejected → "Verification declined" / reason → `/worker-dashboard`

## What stays the same
- `send-push` edge function — no changes needed (already handles single-user sends)
- `push_subscriptions`, VAPID/FCM secrets — already configured
- In-app bell — already realtime; no UI work needed unless we want a dedicated entry in `useNotifications` mapping for these reasons (will check the hook during implementation and add icon/route mapping if needed).

## Deliverables
1. One SQL migration creating the 4 new trigger functions + triggers above.
2. Minor edit to `src/hooks/useNotifications.tsx` if needed so the bell renders proper icon/title for the new reasons.

## Out of scope
- Job-application notifications (user previously declined).
- Review/rating notifications.
- Edge function code changes.

## Open question before implementing
Verification column name on `workers` — I'll inspect it during build. No user input needed.
