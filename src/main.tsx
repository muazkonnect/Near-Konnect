import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, isPreview } from "./lib/pushNotifications";

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

// Register service worker only outside preview/iframe contexts
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  if (isPreview()) {
    // Clean up any leftover SWs in preview/iframe
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  } else {
    registerServiceWorker();
  }
}
