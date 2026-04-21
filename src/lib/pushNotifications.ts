import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

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
    window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("lovable.app"));

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

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function subscribeWebPush(userId: string): Promise<boolean> {
  if (!canUseWebPush()) return false;
  if (!VAPID_PUBLIC_KEY) {
    console.warn("Missing VITE_VAPID_PUBLIC_KEY");
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
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  await (supabase.from("push_subscriptions") as any).upsert(
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
    await (supabase.from("push_subscriptions") as any)
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

export async function isSubscribed(): Promise<boolean> {
  if (!canUseWebPush()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}

// Native (Capacitor) — lazy-loaded so web bundles don't break
export async function registerNativePush(userId: string) {
  try {
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return false;
    const { PushNotifications } = await import(
      /* @vite-ignore */ "@capacitor/push-notifications"
    );

    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      const r = await PushNotifications.requestPermissions();
      if (r.receive !== "granted") return false;
    }

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token: { value: string }) => {
      const platform: "ios" | "android" = cap.getPlatform() === "ios" ? "ios" : "android";
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          platform,
          fcm_token: token.value,
          user_agent: `Capacitor/${platform}`,
        },
        { onConflict: "user_id,fcm_token" }
      );
    });

    PushNotifications.addListener("registrationError", (err: unknown) => {
      console.warn("Native push registration error", err);
    });

    return true;
  } catch (e) {
    // Plugin not installed / not native build — silently ignore
    return false;
  }
}
