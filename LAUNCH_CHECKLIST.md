# NearKonnect — Play Store Launch Checklist

## ✅ Already done
- [x] Role-based route protection (admin / worker / user)
- [x] RLS on all user-data tables with owner-scoped policies
- [x] FCM push notifications wired (web + Capacitor) with `user_fcm_tokens`
- [x] `google-services.json` placed (package `com.nearkonnect.app`)
- [x] `capacitor.config.ts` production-safe (live-reload only when `CAP_LIVE_RELOAD=1`)
- [x] Internal email queue functions hardened (`search_path` pinned, anon revoked)
- [x] HIBP leaked-password check enabled

## ⚠️ Accepted (PostGIS / intentional)
- `spatial_ref_sys` RLS, `st_*` search_path, `postgis` in public — owned by extension, cannot alter
- Public buckets (avatars, ad-images, worker-media) — intentional, filenames are UUIDs

## 🔲 Before you build the AAB

### 1. Build & sync
```bash
git pull
rm -rf android/
npm install
npm run build              # creates /dist
npx cap add android
npx cap sync android
```

### 2. App identity (in `android/app/src/main/`)
- [ ] Replace launcher icons in `res/mipmap-*` (use Android Studio → Image Asset)
- [ ] Replace splash in `res/drawable*`
- [ ] In `AndroidManifest.xml`: set `android:usesCleartextTraffic="false"`
- [ ] In `android/app/build.gradle`: set `versionCode 1`, `versionName "1.0.0"`

### 3. Signing keystore (one-time)
```bash
keytool -genkey -v -keystore nearkonnect-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias nearkonnect
```
Add to `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file('../../nearkonnect-release.jks')
        storePassword System.getenv('KS_PASS')
        keyAlias 'nearkonnect'
        keyPassword System.getenv('KS_KEY_PASS')
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```
**Keep the keystore + passwords backed up — losing them means you can never update the app.**

### 4. Build the AAB
Open `android/` in Android Studio → **Build → Generate Signed App Bundle** → Release.
Output: `android/app/release/app-release.aab`

### 5. Deploy the web app to Vercel (for Privacy Policy URL)
Play Store requires a **public HTTPS** Privacy Policy URL. The app already ships a `/privacy` route — host it on Vercel at `www.nearkonnect.com`:

1. Push the repo to GitHub.
2. In Vercel: **New Project → Import** your GitHub repo.
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add env vars (copy from local `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
4. Deploy. Then **Settings → Domains → Add** `www.nearkonnect.com` and follow Vercel's DNS instructions (CNAME `cname.vercel-dns.com`).
5. `vercel.json` (already in repo) handles SPA deep-link rewrites so `/privacy` works on refresh.
6. Verify `https://www.nearkonnect.com/privacy` loads before submitting to Play Store.
7. In Lovable Cloud → Auth → URL Configuration, add `https://www.nearkonnect.com` as Site URL / additional redirect so email magic-links work from the production domain.

### 6. Play Console
- [ ] App name, short/full description, screenshots (phone + 7" tablet), feature graphic (1024×500)
- [ ] **Privacy Policy URL:** `https://www.nearkonnect.com/privacy`
- [ ] Data safety form: declare email, name, phone, location, photos, FCM token
- [ ] Content rating questionnaire
- [ ] Target audience & content
- [ ] Upload AAB to Internal testing → promote to Production


### 7. Smoke test on a real device
- [ ] Login (email + Google)
- [ ] Receive an FCM push while app is closed
- [ ] Upload profile photo
- [ ] Post a job / blood request
- [ ] Confirm admin panel does NOT appear for normal users
