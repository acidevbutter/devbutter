"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reports when an element first scrolls into view, then stops observing — the
 * homepage's reveals fire once and are never scrubbed. Reduced motion is handled in
 * CSS, where each reveal's settled state is the default, so this stays motion-agnostic.
 */
export default function useRevealOnce<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, shown] as const;
}
