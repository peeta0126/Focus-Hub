"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // A worker installed by a prior production run can still control next dev.
    // Unregistering alone leaves the current document controlled until reload.
    if (process.env.NODE_ENV !== "production") {
      let disposed = false;
      const removeDevelopmentWorker = async () => {
        const scriptURL = new URL("/sw.js", window.location.origin).href;
        const controlled = navigator.serviceWorker.controller?.scriptURL === scriptURL;
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (disposed) return;
        await Promise.all(registrations.filter((registration) =>
          [registration.active, registration.waiting, registration.installing].some((worker) => worker?.scriptURL === scriptURL)
        ).map((registration) => registration.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter((key) => key.startsWith("focus-hub-static-")).map((key) => caches.delete(key)));
        }
        if (controlled && !disposed) window.location.reload();
      };
      void removeDevelopmentWorker().catch((error: unknown) => console.error("Failed to clear development service worker", error));
      return () => { disposed = true; };
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch((error: unknown) => console.error("Service worker registration failed", error));
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
