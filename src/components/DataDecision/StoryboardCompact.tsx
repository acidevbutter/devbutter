"use client";

// Compact storyboard for narrow/short viewports. The 1600×1780 stage would have to
// shrink past legibility here, so the same five scenes play one at a time inside the
// pinned viewport instead of all at once. Same copy, same order, same progress input.

import { forwardRef, useImperativeHandle, useRef } from "react";
import Icon from "./icons";
import styles from "./StoryboardCompact.module.scss";
import {
  BLOCKS,
  OPTIONS,
  RESULT_CARDS,
  SCENES,
  SENTENCE,
  SENTENCE_ACCENT_FROM,
  fitCanvas,
  lerp,
  makeSeeds,
  setOp,
  smooth,
  drawNetwork,
  type StageHandle,
} from "./storyboard";

/** Progress window each scene owns. The desktop stage overlaps them; here they queue. */
const WINDOWS: [number, number][] = [
  [0.0, 0.47],
  [0.47, 0.66],
  [0.66, 0.86],
  [0.86, 0.95],
  [0.95, 1.01],
];
const FADE = 0.025;

export default forwardRef<StageHandle, object>(function StoryboardCompact(_props, ref) {
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const box = useRef({ w: 0, h: 0 });
  const seeds = useRef<number[]>([]);

  const scenes = useRef<(HTMLDivElement | null)[]>([]);
  const blocks = useRef<(HTMLDivElement | null)[]>([]);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const scores = useRef<(HTMLSpanElement | null)[]>([]);
  const ranks = useRef<(HTMLSpanElement | null)[]>([]);
  const rowIcons = useRef<(HTMLSpanElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const words = useRef<(HTMLSpanElement | null)[]>([]);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const output = useRef<HTMLDivElement>(null);
  const sceneLabel = useRef<HTMLSpanElement>(null);
  const sceneNum = useRef<HTMLSpanElement>(null);
  const barFill = useRef<HTMLDivElement>(null);

  const put =
    <T,>(store: React.RefObject<(T | null)[]>, i: number) =>
    (el: T | null) => {
      store.current[i] = el;
    };

  function paintNetwork(p: number, t: number) {
    const c = cv.current;
    if (!c) return;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    if (!ctx.current || ctx.current.canvas !== c || box.current.w !== w || box.current.h !== h) {
      ctx.current = fitCanvas(c, w, h);
      box.current = { w, h };
    }
    const g = ctx.current;
    if (!g) return;
    g.clearRect(0, 0, w, h);
    const camT = smooth(0.52, 0.64, p);
    drawNetwork(
      g,
      { x: 0, y: 0, w, h },
      {
        alpha: 1,
        scale: lerp(2.2, 0.82, camT * camT * (3 - 2 * camT)),
        t,
        p,
        seeds: seeds.current,
      }
    );
  }

  useImperativeHandle(ref, () => ({
    update(p, t) {
      const R = root.current;
      if (!R || R.offsetWidth === 0) return;
      if (!seeds.current.length) seeds.current = makeSeeds();

      // scene cross-fade
      let current = WINDOWS.length - 1;
      const last = WINDOWS.length - 1;
      WINDOWS.forEach(([a, b], i) => {
        // the closing scene has nothing to hand over to, so it never fades back out
        const out = i === last ? 0 : smooth(b - FADE, b + FADE, p);
        const on = smooth(a - FADE, a + FADE, p) * (1 - out);
        const el = scenes.current[i];
        if (el) {
          setOp(el, on);
          el.style.transform = `scale(${lerp(0.96, 1, on)})`;
        }
        if (p >= a && p < b) current = i;
      });

      // 1 — blocks arrive left to right
      blocks.current.forEach((b, i) => {
        if (!b) return;
        const intro = smooth(0.16 + i * 0.055, 0.21 + i * 0.055, p);
        setOp(b, intro);
        b.style.transform = `translateY(${(1 - intro) * 12}px)`;
        b.style.borderColor = `rgba(121,229,155,${lerp(0.2, 0.7, intro)})`;
      });

      // 2 — the network settles out of the viewer's face into the panel
      paintNetwork(p, t);

      // 3 — paths score up, the winner turns green
      const fill = smooth(0.76, 0.83, p);
      const wh = smooth(0.83, 0.86, p);
      rows.current.forEach((row, i) => {
        if (!row) return;
        const ri = smooth(0.68 + i * 0.02, 0.73 + i * 0.02, p);
        setOp(row, ri);
        row.style.transform = `translateX(${(1 - ri) * -14}px)`;
      });
      fills.current.forEach((f, i) => {
        if (f) f.style.width = `${OPTIONS[i].score * fill}%`;
      });
      scores.current.forEach((s, i) => {
        if (s) s.textContent = fill > 0.01 ? `${Math.round(OPTIONS[i].score * fill)}%` : "";
      });
      const wcol = wh > 0.5 ? "#79E59B" : "#F64C6F";
      if (rows.current[0]) {
        rows.current[0]!.style.background = `rgba(121,229,155,${0.09 * wh})`;
      }
      if (ranks.current[0]) ranks.current[0]!.style.color = wcol;
      if (rowIcons.current[0]) rowIcons.current[0]!.style.color = wcol;
      if (scores.current[0]) scores.current[0]!.style.color = wcol;
      if (fills.current[0]) fills.current[0]!.style.background = wcol;
      if (labels.current[0]) labels.current[0]!.style.fontWeight = wh > 0.3 ? "600" : "400";

      // 4 — the selected path lands
      const out = smooth(0.87, 0.91, p);
      if (output.current) {
        setOp(output.current, out);
        output.current.style.transform = `translateY(${(1 - out) * 14}px)`;
      }

      // 5 — sentence and cards build right to left
      const n = words.current.length;
      words.current.forEach((w, i) => {
        if (!w) return;
        const wr = smooth(0.95 + (n - 1 - i) * 0.004, 0.968 + (n - 1 - i) * 0.004, p);
        setOp(w, wr);
        w.style.filter = `blur(${(1 - wr) * 4}px)`;
      });
      cards.current.forEach((c, i) => {
        if (!c) return;
        const from = 0.955 + (3 - i) * 0.008;
        const on = smooth(from, from + 0.021, p);
        setOp(c, Math.max(0.14, on));
        c.style.borderColor = `rgba(121,229,155,${lerp(0.2, 0.65, on)})`;
      });

      // chrome
      if (barFill.current) barFill.current.style.width = `${p * 100}%`;
      const sc = SCENES[current];
      if (sceneLabel.current) sceneLabel.current.textContent = `CENA ${sc[1]} · ${sc[2]}`;
      if (sceneNum.current) sceneNum.current.textContent = `0${sc[1]}/05`;
    },
  }));

  return (
    <div ref={root} className={styles.root}>
      <div className={styles.head}>
        <div className={`mono ${styles.eyebrow}`}>Como trabalhamos</div>
        <h2 className={styles.title}>
          Da <span className="gn">informação</span> à <span className="pk">decisão</span>.
        </h2>
      </div>

      <div className={styles.stage}>
        <div ref={put(scenes, 0)} className={styles.scene}>
          <div className={styles.blocks}>
            {BLOCKS.map((b, i) => (
              <div key={b.n} ref={put(blocks, i)} className={styles.block}>
                <span className={styles.blockIcon}>
                  <Icon name={b.icon} size={18} />
                </span>
                <span className={`mono ${styles.blockNum}`}>{b.n}</span>
                <span className={styles.blockLabel}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div ref={put(scenes, 1)} className={styles.scene}>
          <div className={styles.panel}>
            <canvas ref={cv} className={styles.canvas} aria-hidden="true" />
          </div>
          <div className={`mono ${styles.nucleo}`}>
            <Icon name="fork" size={15} />
            Núcleo de decisão
          </div>
        </div>

        <div ref={put(scenes, 2)} className={styles.scene}>
          <div className={styles.table}>
            <div className={`mono ${styles.tableHead}`}>Caminhos analisados</div>
            {OPTIONS.map((o, i) => (
              <div key={o.rank} ref={put(rows, i)} className={styles.row}>
                <span ref={put(ranks, i)} className={`mono ${styles.rank}`}>
                  {o.rank}
                </span>
                <span ref={put(rowIcons, i)} className={styles.rowIcon}>
                  <Icon name={o.icon} size={16} />
                </span>
                <span ref={put(labels, i)} className={styles.rowLabel}>
                  {o.label}
                </span>
                <span className={styles.bar}>
                  <span ref={put(fills, i)} className={styles.barFill} />
                </span>
                <span ref={put(scores, i)} className={`mono ${styles.score}`} />
              </div>
            ))}
          </div>
        </div>

        <div ref={put(scenes, 3)} className={styles.scene}>
          <div ref={output} className={styles.output}>
            <div className={`mono ${styles.outputSub}`}>
              <Icon name="check" size={15} strokeWidth={2} />
              Automatizar processos · 92
            </div>
            <div className={styles.outputTitle}>Decisões melhores</div>
          </div>
        </div>

        <div ref={put(scenes, 4)} className={styles.scene}>
          <p className={`mono ${styles.sentence}`}>
            {SENTENCE.map((w, i) => (
              <span key={w + i} ref={put(words, i)} className={i >= SENTENCE_ACCENT_FROM ? "pk" : undefined}>
                {w}{" "}
              </span>
            ))}
          </p>
          <div className={styles.cards}>
            {RESULT_CARDS.map((c, i) => (
              <div key={c.label} ref={put(cards, i)} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className="gn">
                    <Icon name={c.icon} size={20} strokeWidth={1.5} />
                  </span>
                  <span className={styles.cardDash}>—</span>
                </div>
                <div className={styles.cardLabel}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer} aria-hidden="true">
        <span ref={sceneLabel} className={`mono ${styles.sceneLabel}`}>
          CENA 1 · BLOCOS APARECEM
        </span>
        <div className={styles.track}>
          <div ref={barFill} className={styles.trackFill} />
        </div>
        <span ref={sceneNum} className={`mono ${styles.sceneNum}`}>
          01/05
        </span>
      </div>
    </div>
  );
});
