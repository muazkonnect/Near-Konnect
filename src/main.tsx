import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);

// Hide splash once React has rendered
requestAnimationFrame(() => {
  setTimeout(() => {
    const splash = document.getElementById("app-splash");
    if (splash) {
      splash.classList.add("is-hidden");
      setTimeout(() => splash.remove(), 500);
    }
  }, 350);
});

// Lazy-load push notifications after first interaction or on idle
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  let initialized = false;
  const init = async () => {
    if (initialized) return;
    initialized = true;
    try {
      const { registerServiceWorker, isPreview } = await import("./lib/pushNotifications");
      if (isPreview()) {
        navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      } else {
        registerServiceWorker();
      }
    } catch {
      /* noop */
    }
  };
  const opts: AddEventListenerOptions = { once: true, passive: true };
  window.addEventListener("pointerdown", init, opts);
  window.addEventListener("keydown", init, opts);
  window.addEventListener("touchstart", init, opts);
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, o?: { timeout?: number }) => number)
    | undefined;
  if (ric) ric(() => init(), { timeout: 6000 });
  else setTimeout(init, 4000);
}
