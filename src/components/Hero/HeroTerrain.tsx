"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.scss";

const PARTICLE_COUNT = 150;

type Particle = {
  el: HTMLSpanElement;
  xr: number;
  baseFy: number;
  wave: number;
  amp: number;
  ph: number;
};

export default function HeroTerrain() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parts: Particle[] = [];
    const frag = document.createDocumentFragment();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const xr = i / (PARTICLE_COUNT - 1);
      const x = Math.min(99.5, Math.max(0.5, xr * 100 + (Math.random() - 0.5) * 2.6));
      const crest = 46 + 52 * (0.5 + 0.5 * Math.sin(xr * Math.PI * 3.1 + 0.6));
      const baseFy = crest + Math.random() * 54;
      const sz = 2 + Math.random() * 3.6;
      const green = Math.random() < 0.5;
      const col = green ? "#79E59B" : "#F64C6F";
      const glow = green ? "#00D26A" : "#FF4FA3";

      const span = document.createElement("span");
      span.style.cssText =
        "position:absolute;bottom:0;left:" +
        x.toFixed(2) +
        "%;width:" +
        sz.toFixed(1) +
        "px;height:" +
        sz.toFixed(1) +
        "px;border-radius:50%;background:" +
        col +
        ";box-shadow:0 0 " +
        Math.round(sz * 2.2) +
        "px " +
        glow +
        ";opacity:0;transform:translateY(28px);will-change:transform,opacity";

      parts.push({ el: span, xr, baseFy, wave: xr * 0.5, amp: 6 + Math.random() * 4, ph: Math.random() * 0.7 });
      frag.appendChild(span);
    }

    el.appendChild(frag);

    if (reduce) {
      parts.forEach((q) => {
        q.el.style.opacity = "1";
        q.el.style.transform = `translateY(${(-q.baseFy).toFixed(1)}px)`;
      });
      return;
    }

    const t0 = performance.now();
    let raf = 0;
    let measureQueued = false;
    let p = 0;

    // Reading layout (getBoundingClientRect) only on scroll/resize — never inside
    // the per-frame render loop below — avoids forced-synchronous-layout thrashing.
    const measure = () => {
      measureQueued = false;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.85)));
    };

    const queueMeasure = () => {
      if (measureQueued) return;
      measureQueued = true;
      requestAnimationFrame(measure);
    };

    queueMeasure();
    window.addEventListener("scroll", queueMeasure, { passive: true });
    window.addEventListener("resize", queueMeasure);

    const loop = () => {
      const t = (performance.now() - t0) / 1000;

      for (const q of parts) {
        const local = Math.max(0, Math.min(1, (p - q.wave) / 0.34));
        const k = q.xr * Math.PI * 4;
        const beat = q.amp * (Math.sin(k - 1.6 * t + q.ph) + Math.sin(k - 2.15 * t));
        const fy = q.baseFy + beat;
        q.el.style.opacity = String(local);
        q.el.style.transform = `translateY(${(28 - (fy + 28) * local).toFixed(1)}px)`;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queueMeasure);
      window.removeEventListener("resize", queueMeasure);
      el.replaceChildren();
    };
  }, []);

  return <div ref={ref} className={styles.terrainParticles} aria-hidden="true" />;
}
