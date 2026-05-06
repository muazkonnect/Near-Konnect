import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  canUseWebPush,
  isPreview,
  registerNativePush,
  registerServiceWorker,
  subscribeWebPush,
} from "@/lib/pushNotifications";

/**
 * Auto-registers the current user's device for push notifications.
 * - Native (Capacitor iOS/Android): requests permission + registers FCM token.
 * - Web: if Notification permission was already granted, ensures a Web Push
 *   subscription exists in the DB. Does NOT auto-prompt the user — that still
 *   happens via the bell toggle to avoid intrusive prompts on first visit.
 */
export const usePushAutoRegister = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // Native first
      const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
      if (isNative) {
        await registerNativePush(user.id);
        return;
      }

      // Web: only if perm already granted (silent re-sync of subscription)
      if (!canUseWebPush() || isPreview()) return;
      try {
        if (Notification.permission !== "granted") return;
        await registerServiceWorker();
        if (cancelled) return;
        await subscribeWebPush(user.id);
      } catch (e) {
        console.warn("Push auto-register failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);
};
