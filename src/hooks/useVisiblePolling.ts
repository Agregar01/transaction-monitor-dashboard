"use client";

import { useEffect, useState } from "react";

/**
 * Returns the supplied interval (ms) while the tab is visible, and 0 when it
 * isn't. RTK Query treats `pollingInterval: 0` as "don't poll", which means
 * background tabs stop hammering the backend (and Netlify functions) until
 * the user comes back.
 */
export function useVisiblePolling(intervalMs: number): number {
  const [visible, setVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState === "visible",
  );

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return visible ? intervalMs : 0;
}
