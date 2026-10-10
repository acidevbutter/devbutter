"use client";

import { useEffect, useRef } from "react";
import type { CurvatureApi, CurvatureOptions } from "./scenes";
import CurvatureFallback, { CURVATURE_DEFAULT_LABEL } from "./CurvatureFallback";
import styles from "./Curvature3D.module.scss";

export type Curvature3DProps = {
  options?: CurvatureOptions;
  paused?: boolean;
  className?: string;
  label?: string;
};

/**
 * Monta o motor WebGL (chunk próprio, importado só no cliente) num palco que o React não
 * toca. O fallback estático fica por baixo até o canvas fazer fade-in — e permanece se o
 * motor devolver o stub (sem WebGL).
 */
export default function Curvature3D({
  options,
  paused = false,
  className,
  label = CURVATURE_DEFAULT_LABEL,
}: Curvature3DProps) {
  const stage = useRef<HTMLDivElement>(null);
  const api = useRef<CurvatureApi | null>(null);
  const pausedRef = useRef(paused);

  // As opções são dados puros; serializar evita remontar a cena a cada objeto inline novo.
  const optionsKey = JSON.stringify(options ?? null);

  useEffect(() => {
    pausedRef.current = paused;
    api.current?.pause(paused);
  }, [paused]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const opts = (JSON.parse(optionsKey) as CurvatureOptions | null) ?? undefined;
    let cancelled = false;
    let mounted: CurvatureApi | null = null;

    import("./curvature")
      .then(({ mountCurvature }) => mountCurvature(el, opts))
      .then((instance) => {
        // Desmontou antes do motor ficar pronto: descarta já.
        if (cancelled) {
          instance.destroy();
          return;
        }
        mounted = instance;
        api.current = instance;
        instance.pause(!!pausedRef.current);
      })
      .catch((err: unknown) => {
        console.warn("curvatura 3D: falha ao montar", err);
      });

    return () => {
      cancelled = true;
      if (mounted) {
        mounted.destroy();
        if (api.current === mounted) api.current = null;
      }
    };
  }, [optionsKey]);

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      role="img"
      aria-label={label}
    >
      <CurvatureFallback decorative />
      <div ref={stage} className={styles.stage} />
    </div>
  );
}
