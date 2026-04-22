

## Goal
Replace the Lovable branding (logo + "Continue to Lovable" text) shown on the Google/Apple OAuth consent screen with NearKonnect's logo and name.

## Why this happens
OAuth sign-in currently uses Lovable's managed OAuth (`@lovable.dev/cloud-auth-js` via `src/integrations/lovable/index.ts`). Because the OAuth app shown to the user belongs to Lovable, the consent screen shows Lovable's logo and "Continue to Lovable". This branding is controlled by the OAuth provider (Google / Apple), not by app code — it cannot be changed by editing files in this project.

To show **your logo and "Continue to NearKonnect"**, the OAuth flow must go through **your own** Google and Apple OAuth apps, registered under your NearKonnect branding.

## Plan

### 1. Switch from Lovable-managed OAuth to direct Supabase OAuth
Replace `lovable.auth.signInWithOAuth(...)` in `src/components/SocialAuthButtons.tsx` with `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })`. This routes sign-in through the Supabase Auth project directly, which uses whatever OAuth credentials are configured in the backend.

### 2. Configure Google OAuth (you do this, outside the app)
- Go to Google Cloud Console → create an OAuth 2.0 Client ID for a Web application.
- On the OAuth consent screen: set **App name = NearKonnect**, upload the **NearKonnect logo**, set support email and homepage. This is what makes the consent screen say "Continue to NearKonnect" with your logo.
- Add authorized redirect URI: `https://lxghuqiheaoinytrwhac.supabase.co/auth/v1/callback`
- Copy the Client ID and Client Secret.
- In Lovable Cloud → Auth → Providers → Google: paste the Client ID and Secret, enable the provider.

### 3. Configure Apple OAuth (you do this, outside the app)
- In Apple Developer → create a Services ID for NearKonnect, configure Sign in with Apple, set the same Supabase callback URL as the return URL.
- Apple shows your Services ID app name on the consent sheet.
- In Lovable Cloud → Auth → Providers → Apple: paste the Services ID, Team ID, Key ID, and the private key.

### 4. Verify
After credentials are saved, click "Continue with Google" / "Continue with Apple" in the app. The consent screen should now show the NearKonnect logo and "Continue to NearKonnect".

## What I will change in code
- `src/components/SocialAuthButtons.tsx` — swap `lovable.auth.signInWithOAuth` for `supabase.auth.signInWithOAuth`, keep the same UI and loading states.

## What only you can do
- Create the Google OAuth app with NearKonnect branding + logo.
- Create the Apple Services ID with NearKonnect branding.
- Paste both sets of credentials into Lovable Cloud's Auth provider settings.

Without step 2 and 3, the consent screen branding cannot change — it is set by Google and Apple based on the OAuth app, not by anything in the codebase.

