"use client";

import { useEffect, useState } from "react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import styles from "./Maintenance.module.scss";

type LogRow = {
  marker: string;
  markerClass: string;
  label: string;
  dim?: boolean;
  caret?: boolean;
};

const ROWS: LogRow[] = [
  { marker: "✓", markerClass: "gn", label: "arquitetura e conteúdo definidos" },
  { marker: "✓", markerClass: "gn", label: "identidade visual aplicada" },
  { marker: "▸", markerClass: "pk", label: "cases e experimentos em redação" },
  { marker: "·", markerClass: "", label: "integração do concierge de IA", dim: true, caret: true },
];

/**
 * The rows land one after the other, like a build log writing itself. Reduced motion is
 * folded in at render time so it shows the settled list instead of the stagger.
 */
export default function StatusLog() {
  const [revealed, setRevealed] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const timers = ROWS.map((_, i) => setTimeout(() => setRevealed(i + 1), 700 + i * 620));
    return () => timers.forEach(clearTimeout);
  }, []);

  const shown = reduceMotion ? ROWS.length : revealed;

  return (
    <div className={`mono ${styles.logBody}`}>
      {ROWS.map((row, i) => (
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
