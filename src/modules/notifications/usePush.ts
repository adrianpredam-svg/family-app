"use client";
import { useCallback, useEffect, useState } from "react";

export type PushState = "unsupported" | "needs-install" | "default" | "granted" | "denied" | "unconfigured";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** Push permission + subscription. `enable()` must be called from a tap (required on iPhone). */
export function usePush() {
  const [state, setState] = useState<PushState>("default");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // iPhone Safari only offers push once the app is on the home screen.
        setState(isIos() && !isStandalone() ? "needs-install" : "unsupported");
        return;
      }
      const { key } = await fetch("/api/push/public-key").then((r) => r.json());
      if (!key) return setState("unconfigured");
      setState(Notification.permission as PushState);
      const reg = await navigator.serviceWorker.ready;
      setSubscribed(!!(await reg.pushManager.getSubscription()));
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = useCallback(async () => {
    const permission = await Notification.requestPermission();
    setState(permission as PushState);
    if (permission !== "granted") return false;
    const { key } = await fetch("/api/push/public-key").then((r) => r.json());
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    setSubscribed(res.ok);
    return res.ok;
  }, []);

  return { state, subscribed, enable };
}
