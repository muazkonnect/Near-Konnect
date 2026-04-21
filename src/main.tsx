import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, isPreview } from "./lib/pushNotifications";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);

// Hide splash as soon as React commits its first paint.
const hideSplash = () => {
  const splash = document.getElementById("app-splash");
  if (!splash || splash.classList.contains("is-hidden")) return;
  splash.classList.add("is-hidden");
  setTimeout(() => splash.remove(), 500);
};

// Primary: hide on next paint after mount
requestAnimationFrame(() => requestAnimationFrame(hideSplash));

// Safety net: never let the splash stick longer than 4s, even if something throws
setTimeout(hideSplash, 4000);

// Extra safety: hide once the window finishes loading
if (document.readyState === "complete") {
  hideSplash();
} else {
  window.addEventListener("load", hideSplash, { once: true });
}

// Register service worker only outside preview/iframe contexts
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  if (isPreview()) {
    // Clean up any leftover SWs in preview/iframe
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  } else {
    registerServiceWorker();
  }
}
