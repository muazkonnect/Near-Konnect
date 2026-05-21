## Problem

The Didit edge function works (tested — returns a valid session URL), and the user has enough Sparks (990 > 500 cost). But clicking **Start ID scan** in the Verification dialog appears to do nothing because:

`window.open(s.url, ...)` is called **after** two `await`s (`startVerification()` and `createDiditSession()`). At that point the call is no longer tied to a trusted user gesture, so every modern browser **blocks the popup**. The user sees the loading spinner finish with no visible result.

## Fix

In `src/components/verification/VerificationDialog.tsx`, inside `startScan`:

1. Call `window.open("about:blank", ...)` **synchronously at the very top** of the click handler (before any `await`). This reserves a popup tied to the user gesture.
2. Run `startVerification()` + `createDiditSession()`.
3. Once the URL is back, navigate the already-open popup via `popup.location.href = s.url`.
4. If the popup was blocked anyway (returned `null` or `closed`), show a toast pointing the user to the "Re-open verification window" fallback button that already exists in the dialog.
5. Close the popup on error.

No DB, no edge function, no other component changes. Single function refactor in `VerificationDialog.tsx`.
