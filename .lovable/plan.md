The error is still happening because Didit is being opened inside the app/preview browsing context. Didit's redirect docs recommend a full-page redirect to `session.url`, not a popup/window embed.

Plan:
1. Update `VerificationDialog.tsx` so the Didit action uses `window.location.href = session.url` instead of `window.open(...)`.
2. Keep the existing session creation and polling logic, but rely on Didit's callback URL to return the user to `/worker-dashboard?verification=complete`.
3. Add handling for that callback query on the worker dashboard/dialog load so it refreshes verification status and shows a clear submitted/review state.
4. Update `didit-create-session` to include `callback_method: "both"`, matching Didit's recommended redirect flow for reliability.

Technical detail:
- This removes popup/iframe behavior completely, which avoids `ERR_BLOCKED_BY_RESPONSE` caused by Didit's browser isolation headers.