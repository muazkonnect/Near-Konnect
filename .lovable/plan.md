

## Mount AI Assistant globally + brand polish

**1. Mount globally**
- Import and render `<SupportChatbot />` in `src/components/AppLayout.tsx` so it appears on every authenticated page (Home, Discover, Dashboards, Messages, Blood Donors, Worker Profile).

**2. Brand the floating button (logo green)**
- Replace the current neutral `bg-card` button with the logo's green (`hsl(var(--primary))` already maps to the brand green in this project — verified via `tailwind.config.ts` / `index.css` tokens).
- White bot icon, white "AI Assistant" label, soft green glow ring, pulsing accent dot retained.
- Slightly larger tap target on mobile (h-14 round pill).

**3. Optimal placement**
- **Mobile**: bottom-right, `bottom-24 right-4` (sits above the mobile bottom nav at h-16, below the safe area). Currently it's bottom-left which collides with the leftmost nav item — moving to bottom-right is cleaner.
- **Desktop**: bottom-right, `bottom-6 right-6` (unchanged — standard chat widget position, doesn't collide with footer or content).
- Chat panel anchors to the same corner so open/close feels natural.

**4. UX polish (carry-over from prior plan)**
- Remove the auto-open-after-10-seconds behavior (intrusive on every page load).
- Extend `support-chat` system prompt so worker recommendations include both `[View Profile](/worker/USER_ID)` and `[Message](/messages?to=USER_ID)` links.
- Ensure `src/pages/Messages.tsx` reads `?to=USER_ID` and opens that conversation on mount (add small effect if missing).

**5. No new tools, tables, or deps**
- Chatbot, edge function, history tables, markdown rendering — all already exist. This is a mount + style + 2 small tweaks.

### Technical notes
- Files touched: `src/components/AppLayout.tsx` (mount), `src/components/SupportChatbot.tsx` (button styling, position, remove auto-open), `supabase/functions/support-chat/index.ts` (add Message link to prompt), `src/pages/Messages.tsx` (handle `?to=` param if not already).
- Z-index: keep `z-[60]` so it sits above bottom nav (`z-50`) but below modals (`z-[100]`).
- Edge function will be redeployed after the prompt change.

