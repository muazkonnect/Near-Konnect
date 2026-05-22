import type { CapacitorConfig } from "@capacitor/cli";

// Set CAP_LIVE_RELOAD=1 locally to enable Lovable sandbox hot-reload.
// For production native builds, leave it unset so the bundled /dist is used.
const liveReload = process.env.CAP_LIVE_RELOAD === "1";

const config: CapacitorConfig = {
  appId: "com.nearkonnect.app",
  appName: "nearkonnectapp",
  webDir: "dist",
  ...(liveReload
    ? {
        server: {
          url: "https://49dc22d2-1a14-4885-a7ae-05d9e3832c1f.lovableproject.com?forceHideBadge=true",
          cleartext: true,
        },
      }
    : {}),
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
