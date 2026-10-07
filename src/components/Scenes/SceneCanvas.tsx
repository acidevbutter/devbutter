"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { SceneApi, SceneKind } from "./types";
import styles from "./SceneCanvas.module.scss";

export interface SceneCanvasProps {
  kind: SceneKind;
  /** Freeze the animation (e.g. while a modal covers the page). The last frame stays. */
  paused?: boolean;
  className?: string;
  /** Accessible description; without it the canvas is treated as decoration. */
  label?: string;
  /** `scope` only: root searched for `[data-fx-mask]` text. Defaults to the canvas's parent. */
  maskRootRef?: RefObject<HTMLElement | null>;
}

/**
 * Canvas scene. WebGL first for `attention` / `neural`, 2D engine as fallback (and always
 * for `scope`). Both engines are dynamic imports so they land in their own client chunks
 * and never run on the server.
 */
export default function SceneCanvas({ kind, paused = false, className, label, maskRootRef }: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const pausedRef = useRef(paused);
  // Set when WebGL passed the probe but failed later (no context, shader error):
  // the canvas is re-keyed so the 2D engine gets a fresh element (issue #63).
  const [force2D, setForce2D] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
    apiRef.current?.pause(paused);
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let api: SceneApi | null = null;

    const adopt = (a: SceneApi) => {
      if (cancelled) {
        a.destroy();
        return;
      }
      api = a;
      apiRef.current = a;
      a.pause(pausedRef.current);
    };

    const mount2D = () =>
      import("./motion2d").then((m) => {
        if (cancelled) return;
        adopt(m.mountMotion2D(canvas, kind, { maskRoot: maskRootRef?.current ?? canvas.parentElement }));
      });

    const load =
      kind === "scope" || force2D
        ? mount2D()
        : import("./scenes3d").then((m) => {
            if (cancelled) return;
            const a = m.mountScene3D(canvas, kind, () => {
              if (!cancelled) setForce2D(true);
            });
            if (a) adopt(a);
            else return mount2D();
          });
    load.catch((e: unknown) => console.warn("cena não carregou", kind, e));

    return () => {
      cancelled = true;
      if (api) api.destroy();
      if (apiRef.current === api) apiRef.current = null;
    };
  }, [kind, maskRootRef, force2D]);

  const cls = className ? `${styles.canvas} ${className}` : styles.canvas;
  const key = force2D ? "2d" : "auto";
  return label ? (
    <canvas key={key} ref={canvasRef} className={cls} role="img" aria-label={label} />
  ) : (
    <canvas key={key} ref={canvasRef} className={cls} aria-hidden="true" />
  );
}
