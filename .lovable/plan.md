## Goal
Make `/w/NK-XXXXXX` share links work on your Vercel-hosted domain.

## Changes

**1. Create `vercel.json` at repo root**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
This makes Vercel serve `index.html` for any deep link (`/w/...`, `/worker/...`, `/discover`, etc.) so React Router can handle it. Without this, refreshing or opening a share link directly returns 404.

## Manual steps for you (Vercel dashboard)

**2. Add environment variables**
In Vercel → Project → Settings → Environment Variables, add (for Production, Preview, Development):
- `VITE_SUPABASE_URL` = `https://lxghuqiheaoinytrwhac.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = (the anon key from `.env`)
- `VITE_SUPABASE_PROJECT_ID` = `lxghuqiheaoinytrwhac`

**3. Redeploy** (Vercel → Deployments → Redeploy latest, or push a commit).

## How it will work after this
- Visitor opens `https://yourdomain.com/w/NK-64M56M` → Vercel serves `index.html` → React Router mounts `WorkerShareRedirect` → it calls the Supabase `worker-share` edge function → gets the real worker UUID → navigates to `/worker/{uuid}`.
- Share links generated in the app already use `window.location.origin`, so they'll automatically use your Vercel domain.

## Not included
- Rich link previews (WhatsApp/iMessage unfurls) under your domain — currently they only render correctly if visitors hit the edge function URL directly.