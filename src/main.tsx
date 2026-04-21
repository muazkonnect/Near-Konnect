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
  setTimeout(() => splash.remove(), 200);
};

// Hide on the very next paint after React mounts
requestAnimationFrame(hideSplash);

// Safety net: hard cap at 1.5s even if something stalls
setTimeout(hideSplash, 1500);

// Register service worker only outside preview/iframe contexts
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  if (isPreview()) {
    // Clean up any leftover SWs in preview/iframe
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  } else {
    registerServiceWorker();
  }
}
