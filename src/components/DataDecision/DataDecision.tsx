"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./DataDecision.module.scss";

const STAGES = [
  {
    key: "raw",
    step: "01",
    title: "Dados brutos",
    desc: "Métricas, mensagens, planilhas e sistemas espalhados — sem conexão entre si.",
  },
  {
    key: "patterns",
    step: "02",
    title: "Padrões",
    desc: "A IA cruza sinais e encontra estrutura onde antes só havia ruído.",
  },
  {
    key: "context",
    step: "03",
    title: "Contexto",
    desc: "RAG e embeddings ligam os dados ao conhecimento do seu negócio.",
  },
  {
    key: "decision",
    step: "04",
    title: "Decisão",
    desc: "Uma recomendação clara, pronta para virar ação.",
  },
] as const;

const DOT_COUNT = 36;

export default function DataDecision() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 1
      : 0
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Progress only needs to change in response to scroll/resize — driving it off a
    // free-running rAF loop instead forces a layout read every frame for no benefit.
    let queued = false;
    const update = () => {
      queued = false;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const total = rect.height - vh;
      const p = total > 0 ? -rect.top / total : 0;
      setProgress(Math.max(0, Math.min(1, p)));
    };

    const queueUpdate = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };

    queueUpdate();
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);

    return () => {
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
    };
  }, []);

  const stageIndex = Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length));
  const litDots = Math.round(progress * DOT_COUNT);

  return (
    <section ref={sectionRef} className={styles.section}>
      <div className={styles.sticky}>
        <div className={styles.inner}>
          <div className={styles.head}>
            <div className={`mono gn ${styles.eyebrow}`}>Da informação à decisão</div>
            <h2 className={styles.h2}>
              Como transformamos <span className="gn">dados</span> em <span className="pk">decisão</span>.
            </h2>
          </div>

          <div className={styles.stage}>
            <div className={styles.stageGlow} />
            <div className={styles.scenes}>
              {STAGES.map((s, i) => (
                <div
                  key={s.key}
                  className={`${styles.scene} ${i === stageIndex ? styles.sceneActive : ""}`}
                >
                  {s.key !== "decision" ? (
                    <div className={styles.dotField} aria-hidden="true">
                      {Array.from({ length: DOT_COUNT }).map((_, di) => {
                        const lit = di < litDots;
                        const green = di % 2 === 0;
                        return (
                          <span
                            key={di}
                            className={`${styles.dot} ${lit ? (green ? styles.dotGreen : styles.dotPink) : ""}`}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.core} aria-hidden="true">
                      →
                    </div>
                  )}
                  <div className={styles.sceneLabel}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.steps} aria-hidden="true">
            {STAGES.map((s, i) => (
              <span
                key={s.key}
                className={`${styles.step} ${i === stageIndex ? styles.stepActive : ""}`}
              />
            ))}
          </div>
          <div className={`mono ${styles.progressLabel}`}>
            {STAGES[stageIndex].step} · {STAGES[stageIndex].title}
          </div>
        </div>
      </div>
    </section>
  );
}
