import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// Hide splash as soon as React commits its first paint.
const hideSplash = () => {
  const splash = document.getElementById("app-splash");
  if (!splash || splash.classList.contains("is-hidden")) return;
  splash.classList.add("is-hidden");
  setTimeout(() => splash.remove(), 200);
};

try {
  createRoot(rootElement).render(<App />);
  // Hide on the very next paint after React mounts
  requestAnimationFrame(hideSplash);
} catch (err) {
  // If the app fails to mount, never trap the user behind the splash
  console.error("Failed to mount app", err);
  hideSplash();
  throw err;
}

// Safety net: hard cap at 1.2s even if something stalls
setTimeout(hideSplash, 1200);

// Defer service worker registration until the browser is idle so it doesn't
// compete with the initial paint.
const registerSW = () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  import("./lib/pushNotifications").then(({ registerServiceWorker, isPreview }) => {
    if (isPreview()) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    } else {
      registerServiceWorker();
    }
  });
};

if (typeof (window as any).requestIdleCallback === "function") {
  (window as any).requestIdleCallback(registerSW, { timeout: 2500 });
} else {
  setTimeout(registerSW, 1500);
}
