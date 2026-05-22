import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

let cachedVapidKey: string | null = null;
async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;
  try {
    const { data, error } = await supabase.functions.invoke("vapid-public-key");
    if (error || !data?.key) return null;
    cachedVapidKey = data.key as string;
    return cachedVapidKey;
  } catch {
    return null;
  }
}

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com"));

export const canUseWebPush = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  !isInIframe;

export const isPreview = () => isPreviewHost || isInIframe;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker() {
  if (!canUseWebPush() || isPreview()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.warn("SW register failed", e);
    return null;
  }
}

export async function subscribeWebPush(userId: string): Promise<boolean> {
  if (!canUseWebPush()) return false;
  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) {
    console.warn("VAPID public key unavailable. Make sure VAPID_PUBLIC_KEY secret is set.");
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerServiceWorker());
  if (!reg) return false;
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  const json = sub.toJSON();
  await sb.from("push_subscriptions").upsert(
    {
      user_id: userId,
      platform: "web",
      endpoint: json.endpoint!,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "user_id,endpoint" }
  );
  return true;
}

export async function unsubscribeWebPush(userId: string) {
  if (!canUseWebPush()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await sb.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

export async function isSubscribed(): Promise<boolean> {
  if (!canUseWebPush()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}

// Native (Capacitor) — opt-in. Plugin imported dynamically so the web bundle
// stays small and works without the native runtime.
let _nativeListenersBound = false;

export async function registerNativePush(userId: string) {
  try {
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return false;

    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      const r = await PushNotifications.requestPermissions();
      if (r.receive !== "granted") return false;
    }

    await PushNotifications.register();

    if (!_nativeListenersBound) {
      _nativeListenersBound = true;

      PushNotifications.addListener("registration", async (token) => {
        const platform: "ios" | "android" = cap.getPlatform() === "ios" ? "ios" : "android";
        await sb.from("push_subscriptions").upsert(
          {
            user_id: userId,
            platform,
            fcm_token: token.value,
            user_agent: `Capacitor/${platform}`,
          },
          { onConflict: "user_id,fcm_token" }
        );
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.warn("Native push registration error", err);
      });

      // Tap on a notification → navigate to the URL we packed in data
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const url = (action.notification?.data as any)?.url as string | undefined;
        if (url && typeof window !== "undefined") {
          window.location.assign(url.startsWith("http") ? url : url || "/");
        }
      });
    }

    return true;
  } catch (e) {
    console.warn("registerNativePush failed", e);
    return false;
  }
}

// Clean up the device's FCM token from the DB on logout
export async function unregisterNativePush(userId: string) {
  try {
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return;
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllListeners();
    _nativeListenersBound = false;
    await sb.from("push_subscriptions").delete().eq("user_id", userId).not("fcm_token", "is", null);
  } catch (e) {
    console.warn("unregisterNativePush failed", e);
  }
}

