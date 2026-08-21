"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import useMediaQuery from "@/hooks/useMediaQuery";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import type { FlaskPlacement } from "./Scene3D";
import styles from "./Flask3D.module.scss";

export type { FlaskPlacement };

/** A query that never matches, so an unused variant can still be hooked unconditionally. */
const NEVER = "(width: 0)";

// three.js is the heaviest thing on these pages by far, and no copy, form or contact
// detail is worth delaying for it — so it never enters the server render and only
// downloads once the browser is idle.
const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });

type Flask3DProps = {
  /** The flat SVG flask. Server-rendered, and the permanent fallback where 3D can't run. */
  fallback: ReactNode;
  placement: FlaskPlacement;
  /**
   * Where the stage gets too cramped to hold the flask beside the content, it leaves the
   * stage and sits behind the whole page instead — kept quiet enough to read text over.
   */
  backdrop?: FlaskPlacement & { query: string };
  /** Orbiting node rings. Off where the stage already carries its own node layer. */
  rings?: boolean;
};

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

function whenIdle(run: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 2500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 900);
  return () => window.clearTimeout(id);
}

/**
 * Owns the flask on a stage. The flat SVG renders on the server and holds the layout; the
 * WebGL scene fades in over it only where it can actually run well, and the loop is parked
 * whenever the stage is off screen or the tab is in the background.
 */
export default function Flask3D({
  fallback,
  placement,
  backdrop,
  rings = false,
}: Flask3DProps) {
  const reduced = usePrefersReducedMotion();
  // Hooks can't be conditional, so an unused variant watches a query that never matches.
  const isBackdrop = useMediaQuery(backdrop?.query ?? NEVER);
  const host = useRef<HTMLDivElement>(null);

  const [mount, setMount] = useState(false);
  const [live, setLive] = useState(false);
  // Starts parked so a stage sitting below the fold never burns a frame before anyone
  // has seen it; the observer reports the real state as soon as it attaches.
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    if (!supportsWebGL()) return;
    return whenIdle(() => setMount(true));
  }, []);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "120px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Parked off screen and in background tabs; drawn once and left alone for visitors who
  // asked for reduced motion; running only when it is actually being looked at.
  // As a fixed backdrop it is always on screen, so only the tab state can park it.
  const parked = backdrop && isBackdrop ? !tabVisible : !inView || !tabVisible;
  const frameloop = parked ? "never" : reduced ? "demand" : "always";

  const active = backdrop && isBackdrop ? backdrop : placement;

  return (
    <div
      className={`${styles.root} ${backdrop && isBackdrop ? styles.backdrop : ""}`}
      ref={host}
      aria-hidden="true"
    >
      <div className={`${styles.fallback} ${live ? styles.fallbackHidden : ""}`}>
        {fallback}
      </div>
      {mount && (
        <div className={`${styles.canvasWrap} ${live ? styles.canvasWrapLive : ""}`}>
          <Scene3D
            animated={!reduced}
            frameloop={frameloop}
            placement={active}
            rings={rings}
            onReady={() => setLive(true)}
          />
        </div>
      )}
    </div>
  );
}
