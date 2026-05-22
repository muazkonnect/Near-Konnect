## Plan

Deploying to **Vercel** at `www.nearkonnect.com`. Vercel serves Vite SPAs out of the box — no special config needed for the `/privacy` route beyond a tiny rewrite file so deep links don't 404.

### 1. Create `src/pages/Privacy.tsx`
NearKonnect-specific privacy policy. Uses existing design tokens. Includes:
- App name, contact email placeholder (`support@nearkonnect.com`)
- Data collected: email, auth credentials, FCM push token, profile data, location/media (if used)
- Third parties: Lovable Cloud (backend/auth/storage), Firebase Cloud Messaging
- Data retention + user deletion request flow
- Children's policy (13+)
- Effective date
- SEO: `react-helmet-async` with `<title>`, meta description, canonical = `https://www.nearkonnect.com/privacy`, single H1

### 2. Register route in `src/App.tsx`
Add `/privacy` → `<Privacy />` (public, no auth guard).

### 3. Add `vercel.json` at project root
SPA rewrite so `/privacy` and other deep links work on refresh:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 4. Update `LAUNCH_CHECKLIST.md`
- Privacy Policy URL = `https://www.nearkonnect.com/privacy`
- Remove Google OAuth redirect URI section (not used)
- Add Vercel deploy notes: connect GitHub repo → framework preset Vite → build command `npm run build` → output `dist` → add `www.nearkonnect.com` as custom domain in Vercel
- Add Lovable Cloud Auth Site URL update: set to `https://www.nearkonnect.com` and add to Additional Redirect URLs

### Notes
- You'll still need DNS for `www.nearkonnect.com` pointed to Vercel (CNAME `cname.vercel-dns.com`).
- After deploy, update Lovable Cloud → Auth → URL Configuration to add `https://www.nearkonnect.com` so email links/auth callbacks work.
- No business logic, auth, or notification code is touched.