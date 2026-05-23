## Goal
Add a second factor for admin access: after a user with the `admin` role logs in with email + password, they must enter a 6-digit code sent to their email before the `/admin` panel unlocks.

## How it works
1. Admin logs in normally (email + password).
2. When they navigate to `/admin`, the app checks for a valid "admin session" flag.
3. If missing/expired, show an Admin Verification screen instead of the dashboard.
4. App calls an edge function `admin-otp-send` → generates a 6-digit code, stores a hash in DB with 10-min expiry, emails it via Lovable transactional email to the admin's verified email.
5. Admin enters the code → app calls `admin-otp-verify` → on success, sets an admin session row (valid e.g. 8 hours) and the panel unlocks.
6. After expiry or sign-out, admin must re-verify.

## Database (new)
- `admin_otp_codes` — `user_id`, `code_hash`, `expires_at`, `consumed_at`, `attempts`. RLS: no client access; only edge functions (service role).
- `admin_sessions` — `user_id`, `token_hash`, `expires_at`, `created_at`, `ip`, `user_agent`. RLS: user can read their own active session (to check expiry); writes only via edge function.
- Rate limiting: max 5 OTP requests / 15 min per admin; max 5 wrong attempts per code.

## Edge functions (new)
- `admin-otp-send` — verifies caller has `admin` role, rate-limits, creates code, enqueues email via existing transactional email infra.
- `admin-otp-verify` — verifies code hash + expiry + attempt count, issues admin session token (random opaque string stored hashed), returns it to client. Client stores token in `sessionStorage` (cleared on tab close) + we also persist `admin_sessions` row so server can validate.
- `admin-session-check` — validates token against `admin_sessions` (not expired, matches hash). Called by `RoleProtectedRoute` for `/admin`.

## Frontend
- New `AdminOtpGate` component wrapping the admin route content. Shows "Send code" → OTP input → verify. On success, stores session token and renders children.
- Update `RoleProtectedRoute` usage for `/admin` (and `/admin/*`) in `src/App.tsx` to wrap with `AdminOtpGate` after role check passes.
- Add small banner in admin nav with "Lock admin panel" button to clear the session token.

## Email
- Requires Lovable email domain + transactional email infra. If not set up, the first run will prompt the user through the email setup dialog, then scaffold transactional emails + add `admin-otp` template.

## Notes
- The OTP step only triggers for `/admin` — worker dashboard etc. unaffected.
- Codes are stored hashed (SHA-256). Tokens too. Codes are single-use.
- Optional: also require OTP on initial admin login if you prefer (let me know — current plan triggers it when entering /admin, which covers the same goal with less friction).

Confirm and I'll implement.
