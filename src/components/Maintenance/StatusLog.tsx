"use client";

import { useEffect, useState } from "react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import type { LogRow } from "./copy";
import styles from "./Maintenance.module.scss";

/**
 * The rows land one after the other, like a build log writing itself. Reduced motion is
 * folded in at render time so it shows the settled list instead of the stagger.
 */
export default function StatusLog({ rows }: { rows: LogRow[] }) {
  const [revealed, setRevealed] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const timers = rows.map((_, i) => setTimeout(() => setRevealed(i + 1), 700 + i * 620));
    return () => timers.forEach(clearTimeout);
  }, [rows]);

  const shown = reduceMotion ? rows.length : revealed;

  return (
    <div className={`mono ${styles.logBody}`}>
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={`${styles.logRow} ${row.dim ? styles.logRowDim : ""} ${
            i < shown ? styles.logRowShown : ""
          }`}
        >
          <span className={row.markerClass}>{row.marker}</span>
          <span>
            {row.label}
            {row.caret && <span className={styles.caret}>▮</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
