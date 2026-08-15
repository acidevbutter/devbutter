"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Same shape as `usePrefersReducedMotion`: the server has no query to read, so its
 * snapshot is "does not match" and React swaps in the real value after hydration.
 */
export default function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
