## Problem

The verified email domain is `notify.nearkonnect.com`, but two edge functions are using wrong values for `SENDER_DOMAIN`, causing the "send path not ready" error:

- `supabase/functions/auth-email-hook/index.ts` → uses `"connect@nearkonnect.com"` (an email address, not a domain — invalid format)
- `supabase/functions/admin-otp-send/index.ts` → uses `"notify.www.nearkonnect.com"` (wrong subdomain, not verified)

## Fix

1. In `auth-email-hook/index.ts`, set:
   - `SENDER_DOMAIN = "notify.nearkonnect.com"`
   - `ROOT_DOMAIN = "nearkonnect.com"`
2. In `admin-otp-send/index.ts`, set:
   - `SENDER_DOMAIN = "notify.nearkonnect.com"`
3. Redeploy `auth-email-hook`, `admin-otp-send`, and `process-email-queue`.
4. Verify by checking `email_send_log` for a new send after retry.