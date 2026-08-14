"use client";

// Section 6 — "Da informação à decisão".
// The storyboard's own scrubbing (wheel capture + body drag) is replaced by page
// scroll: the section is 420vh tall with a pinned viewport, and scroll position maps
// to the sequence's 0→1 progress. Progress is eased toward its target the same way
// the source did, so the motion keeps its trailing feel.

import { useEffect, useRef } from "react";
import StoryboardCompact from "./StoryboardCompact";
import StoryboardStage from "./StoryboardStage";
import styles from "./DataDecision.module.scss";
import type { StageHandle } from "./storyboard";

const STAGE_W = 1600;
const STAGE_H = 1780;

export default function DataDecision() {
  const section = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<StageHandle>(null);
  const compact = useRef<StageHandle>(null);

  useEffect(() => {
    const sec = section.current;
    const vp = viewport.current;
    if (!sec || !vp) return;

    const push = (p: number, t: number) => {
      stage.current?.update(p, t);
      compact.current?.update(p, t);
    };

    // Scale the fixed 1600×1780 stage down to whatever the pinned viewport gives us.
    const fit = () => {
      const r = vp.getBoundingClientRect();
      const s = Math.min((r.width * 0.98) / STAGE_W, (r.height * 0.96) / STAGE_H);
      vp.style.setProperty("--stage-scale", String(s || 1));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(vp);

    // Design note on this section: under reduced motion, hold the sequence at p = 1.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      push(1, 0);
      // The stages skip work while their variant is hidden, so re-run on resize in
      // case the breakpoint flips and the other variant needs its first paint.
      const settle = () => push(1, 0);
      window.addEventListener("resize", settle);
      return () => {
        ro.disconnect();
        window.removeEventListener("resize", settle);
      };
    }

    let p = 0;
    let target = 0;
    let raf = 0;
    let started = false;
    const t0 = performance.now();

    // The canvas animates continuously, so the loop parks itself once the section
    // leaves the viewport and any scroll wakes it back up.
    const frame = (ts: number) => {
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.top >= vh || r.bottom <= 0) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);

      const total = r.height - vh;
      target = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0;
      if (!started) {
        // don't play the whole sequence back when the section is entered mid-way
        started = true;
        p = target;
      }
      p += (target - p) * 0.14;
      if (Math.abs(target - p) < 0.0004) p = target;
      push(p, (ts - t0) / 1000);
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    kick();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);

    return () => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /** The scrubber seeks by moving the page, since scroll is what drives progress. */
  const seek = (fraction: number) => {
    const sec = section.current;
    if (!sec) return;
    const r = sec.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    if (total <= 0) return;
    window.scrollTo({ top: window.scrollY + r.top + fraction * total });
  };

  return (
    <section ref={section} className={styles.section}>
      <div ref={viewport} className={styles.viewport}>
        <div className={styles.stageWrap}>
          <StoryboardStage ref={stage} onSeek={seek} />
        </div>
        <div className={styles.compactWrap}>
          <StoryboardCompact ref={compact} />
        </div>
      </div>
    </section>
  );
}
