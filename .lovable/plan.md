## Problem

`verify.didit.me` returns `ERR_BLOCKED_BY_RESPONSE` because Didit sends a `Cross-Origin-Opener-Policy` header that refuses to render inside a popup which (a) was first opened as `about:blank` on our origin and then (b) navigated cross-origin while keeping an opener relationship with our window.

The current `startScan` flow does exactly that: `window.open("about:blank", ...)` → `await` → `popup.location.href = s.url`. Didit blocks the navigated response.

## Fix

Refactor `src/components/verification/VerificationDialog.tsx` into a two-click flow:

1. **Step 1 — "Start ID scan" button**
   - Runs `startVerification()` + `createDiditSession()`.
   - Stores the returned `session` in state.
   - Starts the 5-second `getDiditDecision` polling loop immediately (independent of whether the popup is open).
   - Does NOT open any window.

2. **Step 2 — "Open verification window" button** (shown once `session` is set)
   - Calls `window.open(session.url, "_blank", "noopener,noreferrer")` **synchronously inside the click handler**.
   - `noopener` severs the opener relationship, which is what Didit's COOP requires — no more `ERR_BLOCKED_BY_RESPONSE`.
   - No `about:blank`, no later redirect.

3. **Manual "I've completed verification"** button stays as the final fallback.

4. When the poll detects approved / in_review / completed, call `submitVerification(...)`, toast success, clear session, refetch.

Only file touched: `src/components/verification/VerificationDialog.tsx`. No edge function, DB, or other component changes.
