
Simplest fix: in the client, treat any `fnError` from `check-face-duplicate` (and the auto-submit path in `VerifyFace`) as a duplicate-user case and show "User Exists" — no edge function changes needed.

## Plan

1. **`src/components/SignupFaceCapture.tsx`** — in `confirmImage`, when `supabase.functions.invoke` returns `fnError`, skip body parsing and immediately:
   - Set error to `"User already exists. Only one account is allowed per person."`
   - Show `toast.error("User Exists", { description: ... })`
   - Clear preview, call `onChange(null)`, set status to `idle`
   - Return (no retry)
   - Keep the existing success-path handling for `data.duplicate` as-is.

2. **`src/pages/VerifyFace.tsx`** — in the auto-submit block, when `error` is returned from `verify-face`, treat it the same way: show "User Exists" toast, clear pending image, sign out, redirect to `/login`.

No edge function, schema, or DB changes. Minimal, contained to two files.
