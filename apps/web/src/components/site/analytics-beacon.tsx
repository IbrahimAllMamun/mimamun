"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type EventType = "page_view" | "download" | "outbound_click";

function send(body: { type: EventType; path: string; referrer?: string | null; target?: string | null }) {
  try {
    const payload = new Blob([JSON.stringify(body)], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/analytics/events", payload)) {
      void fetch("/api/analytics/events", { method: "POST", body: payload, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    // Analytics must never interfere with browsing.
  }
}

function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

/** Editors previewing drafts are not visitors. */
function isPrivatePath(path: string): boolean {
  return path.startsWith("/preview") || path.startsWith("/admin");
}

/**
 * Cookie-less, anonymous page-view and link tracking. Nothing is sent when
 * the visitor has Do Not Track or Global Privacy Control enabled.
 */
export function AnalyticsBeacon() {
  const pathname = usePathname();
  const firstView = useRef(true);

  useEffect(() => {
    if (optedOut() || isPrivatePath(pathname)) return;
    send({ type: "page_view", path: pathname, referrer: firstView.current ? document.referrer || null : null });
    firstView.current = false;
  }, [pathname]);

  useEffect(() => {
    if (optedOut()) return;
    const onClick = (event: MouseEvent) => {
      if (isPrivatePath(window.location.pathname)) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.pathname === "/cv") return; // counted server-side
      if (url.origin !== window.location.origin && /^https?:$/.test(url.protocol)) {
        send({ type: "outbound_click", path: window.location.pathname, target: `${url.origin}${url.pathname}` });
      } else if (url.origin === window.location.origin && url.pathname.startsWith("/media/")) {
        send({ type: "download", path: window.location.pathname, target: url.pathname });
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
