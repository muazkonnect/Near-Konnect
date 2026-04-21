import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const hideSplash = () => {
  const fn = (window as any).__hideSplash;
  if (typeof fn === "function") fn();
};

try {
  createRoot(rootElement).render(<App />);
  requestAnimationFrame(hideSplash);
} catch (err) {
  console.error("Failed to mount app", err);
  hideSplash();
  throw err;
}

// Defer service worker registration until the browser is idle.
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
