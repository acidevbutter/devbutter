"use client";

// Desktop storyboard — the 1600×1780 stage from `Da informacao a decisao.dc.html`,
// uniformly scaled to fit the pinned viewport. Geometry lives in the SCSS module in
// the design's own coordinates; everything time-varying is written straight to the
// DOM from the scroll driver's frame loop, so React renders this tree exactly once.

import { forwardRef, useImperativeHandle, useRef } from "react";
import Icon from "./icons";
import styles from "./StoryboardStage.module.scss";
import {
  BLOCKS,
  GREEN,
  OPTIONS,
  RESULT_CARDS,
  SENTENCE,
  SENTENCE_ACCENT_FROM,
  pixelRatio,
  fitCanvas,
  frac,
  kf,
  lerp,
  quad,
  setOp,
  smooth,
  drawBlockFeed,
  drawNetwork,
  type StageHandle,
} from "./storyboard";

const W = 1600;
const H = 1780;

/** Where the neural network settles once the camera finishes pulling back. */
const PANEL = { x: 350, y: 470, w: 900, h: 340 };

export default forwardRef<StageHandle, object>(function StoryboardStage(_props, ref) {
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const ratio = useRef(0);

  const eyebrow = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const blocks = useRef<(HTMLDivElement | null)[]>([]);
  const bicons = useRef<(HTMLSpanElement | null)[]>([]);
  const blines = useRef<(HTMLSpanElement | null)[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const nucleo = useRef<HTMLDivElement>(null);
  const arcs = useRef<(SVGPathElement | null)[]>([]);
  const conns = useRef<(SVGElement | null)[]>([]);
  const ldot = useRef<SVGCircleElement>(null);
  const rdot = useRef<SVGCircleElement>(null);

  const s3 = useRef<HTMLDivElement>(null);
  const s3head = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const ranks = useRef<(HTMLSpanElement | null)[]>([]);
  const icons = useRef<(HTMLSpanElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const scores = useRef<(HTMLSpanElement | null)[]>([]);

  const output = useRef<HTMLDivElement>(null);
  const outsub = useRef<HTMLDivElement>(null);
  const outword = useRef<HTMLSpanElement>(null);

  const s5box = useRef<HTMLDivElement>(null);
  const words = useRef<(HTMLSpanElement | null)[]>([]);
  const rcards = useRef<(HTMLDivElement | null)[]>([]);

  const hint = useRef<HTMLDivElement>(null);

  const put =
    <T,>(store: React.RefObject<(T | null)[]>, i: number) =>
    (el: T | null) => {
      store.current[i] = el;
    };

  function draw(p: number, t: number) {
    const g = ctx.current;
    if (!g) return;
    g.clearRect(0, 0, W, H);
    g.lineCap = "round";

    // ambient ground lines under the result cards
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      const yy = 1420 + k * 55;
      const amp = 16 + k * 8;
      for (let x = 0; x <= W; x += 20) {
        const y = yy + Math.sin(x * 0.006 + k * 1.3 + t * 0.05) * amp;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      const grad = g.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "rgba(121,229,155,0.12)");
      grad.addColorStop(0.5, "rgba(121,229,155,0.02)");
      grad.addColorStop(1, "rgba(246,76,111,0.12)");
      g.strokeStyle = grad;
      g.lineWidth = 1;
      g.stroke();
    }

    // once the whole chain is up, current runs the connectors and feeds the network
    const feed = kf(p, [
      [0.82, 0],
      [0.89, 1],
      [1, 1],
    ]);
    if (feed > 0.001) drawBlockFeed(g, feed, t);

    const netAlpha = kf(p, [
      [0.49, 0],
      [0.56, 1],
      [1, 1],
    ]);
    if (netAlpha <= 0.001) return;

    // camera dolly: the network starts past the viewer and retreats into the panel
    const camT = smooth(0.52, 0.64, p);
    const scale = lerp(2.2, 1, camT * camT * (3 - 2 * camT));
    drawNetwork(g, PANEL, { alpha: netAlpha, scale, t });

    // dashed path carrying the decision down to the options table
    const pathA = kf(p, [
      [0.63, 0],
      [0.71, 1],
      [0.8, 1],
      [0.855, 0],
    ]);
    if (pathA <= 0.001) return;
    const y0 = PANEL.y + PANEL.h;
    const y1 = 1270;
    g.save();
    g.globalAlpha = pathA;
    g.setLineDash([2, 9]);
    g.strokeStyle = `rgba(${GREEN},0.8)`;
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(800, y0);
    g.lineTo(800, y1);
    g.stroke();
    g.setLineDash([]);
    for (let k = 0; k < 4; k++) {
      const ph = frac(k * 0.25 + t * 0.14 + p);
      g.beginPath();
      g.arc(800, y0 + (y1 - y0) * ph, 2.6, 0, 7);
      g.fillStyle = `rgba(${GREEN},0.95)`;
      g.shadowBlur = 10;
      g.shadowColor = `rgba(${GREEN},0.9)`;
      g.fill();
      g.shadowBlur = 0;
    }
    g.restore();
  }

  function paint(p: number, zoom: number) {
    const R = root.current;
    if (!R || !title.current || !s3.current || !output.current) return;

    // the whole UI dips out while the network flies through the viewer
    const masterUI = kf(p, [
      [0.0, 0],
      [0.05, 1],
      [0.47, 1],
      [0.55, 0.1],
      [0.6, 0.1],
      [0.66, 1],
      [1, 1],
    ]);

    // header: opens big and centred, then docks to the top
    const titleIn = smooth(0.0, 0.05, p);
    const dock = smooth(0.06, 0.15, p);
    setOp(title.current, masterUI * titleIn);
    title.current.style.transform = `translateY(${lerp(430, 0, dock)}px) scale(${lerp(1.9, 1, dock)})`;
    const eb = smooth(0.1, 0.16, p);
    setOp(eyebrow.current, masterUI * eb);
    if (eyebrow.current) eyebrow.current.style.transform = `translateY(${(1 - eb) * 10}px)`;

    // one block lights at a time until all four are in, then they all stay lit
    let active = -1;
    if (p < 0.375) {
      active = 0;
      for (let i = 0; i < 4; i++) {
        if (smooth(0.16 + i * 0.055, 0.21 + i * 0.055, p) > 0.5) active = i;
      }
    }
    blocks.current.forEach((b, i) => {
      if (!b) return;
      const intro = smooth(0.16 + i * 0.055, 0.21 + i * 0.055, p);
      setOp(b, masterUI * intro);
      b.style.transform = `translateY(${(1 - intro) * 14}px)`;
      const on = active === i || active === -1;
      b.style.borderColor = on ? "rgba(121,229,155,0.85)" : "rgba(121,229,155,0.2)";
      b.style.boxShadow = on ? "0 0 26px rgba(121,229,155,0.28)" : "none";
      b.style.background = on ? "rgba(11,15,24,0.7)" : "rgba(11,15,24,0.4)";
    });
    const iconsIn = smooth(0.8, 0.87, p);
    bicons.current.forEach((el) => setOp(el, iconsIn));
    blines.current.forEach((el, i) => setOp(el, masterUI * smooth(0.2 + i * 0.055, 0.25 + i * 0.055, p)));

    // network panel + its caption
    if (panel.current) {
      panel.current.style.left = `${PANEL.x}px`;
      panel.current.style.width = `${PANEL.w}px`;
      setOp(
        panel.current,
        masterUI *
          kf(p, [
            [0.6, 0],
            [0.67, 1],
            [1, 1],
          ])
      );
    }
    if (nucleo.current) {
      nucleo.current.style.left = `${PANEL.x + PANEL.w / 2}px`;
      nucleo.current.style.top = `${PANEL.y + PANEL.h + 34}px`;
      setOp(
        nucleo.current,
        masterUI *
          kf(p, [
            [0.62, 0],
            [0.69, 1],
            [1, 1],
          ])
      );
    }

    // corner arcs with a dot travelling each one, plus the vertical connector
    const arcIn =
      masterUI *
      kf(p, [
        [0.02, 0],
        [0.12, 1],
        [1, 1],
      ]);
    arcs.current.forEach((el) => setOp(el, arcIn * 0.85));
    const connIn =
      masterUI *
      kf(p, [
        [0.62, 0],
        [0.69, 1],
        [1, 1],
      ]);
    conns.current.forEach((el) => setOp(el, connIn));
    const lp = quad({ x: 40, y: 152 }, { x: 220, y: 92 }, { x: 372, y: 258 }, smooth(0, 0.5, p));
    const rp = quad({ x: 1560, y: 152 }, { x: 1380, y: 92 }, { x: 1228, y: 258 }, smooth(0.5, 1, p));
    if (ldot.current) {
      ldot.current.setAttribute("cx", String(lp.x));
      ldot.current.setAttribute("cy", String(lp.y));
      setOp(ldot.current, arcIn);
    }
    if (rdot.current) {
      rdot.current.setAttribute("cx", String(rp.x));
      rdot.current.setAttribute("cy", String(rp.y));
      setOp(rdot.current, arcIn * smooth(0.5, 0.55, p));
    }

    // ---- options table ----
    const s3in = kf(p, [
      [0.69, 0],
      [0.74, 1],
      [1, 1],
    ]);
    setOp(s3.current, s3in);
    // the table's chrome dissolves as the winning row travels to the output card
    const chromeExit = smooth(0.885, 0.905, p);
    s3.current.style.borderColor = `rgba(246,76,111,${0.22 * (1 - chromeExit)})`;
    s3.current.style.background = `rgba(16,22,34,${0.55 * (1 - chromeExit)})`;
    setOp(s3head.current, 1 - chromeExit);

    const fill = smooth(0.77, 0.81, p);
    const loseExit = smooth(0.885, 0.905, p);
    rows.current.forEach((row, i) => {
      if (!row) return;
      const ri = smooth(0.71 + i * 0.015, 0.76 + i * 0.015, p);
      if (i === 0) {
        setOp(row, ri);
        row.style.filter = "none";
      } else {
        setOp(row, ri * (1 - loseExit));
        row.style.filter = `blur(${loseExit * 3}px)`;
      }
      row.style.transform = `translateX(${(1 - ri) * -18}px)`;
    });
    fills.current.forEach((f, i) => {
      if (f) f.style.width = `${OPTIONS[i].score * fill}%`;
    });
    scores.current.forEach((s, i) => {
      if (s) s.textContent = fill > 0.01 ? `${Math.round(OPTIONS[i].score * fill)}%` : "";
    });

    // winner row: highlighted, then flipped from pink to green
    const win = rows.current[0];
    const winRank = ranks.current[0];
    const winIcon = icons.current[0];
    const winLabel = labels.current[0];
    const winBar = bars.current[0];
    const winScore = scores.current[0];
    if (!win || !winLabel || !winRank || !winIcon || !winBar || !winScore) return;

    const wh = smooth(0.815, 0.845, p) * (s3in > 0.5 ? 1 : 0);
    win.style.background = `rgba(121,229,155,${0.09 * wh})`;
    win.style.boxShadow = wh > 0.3 ? "0 0 20px rgba(121,229,155,0.18)" : "none";
    const wcol = wh > 0.5 ? "#79E59B" : "#F64C6F";
    winRank.style.color = wcol;
    winIcon.style.color = wcol;
    winScore.style.color = wcol;
    if (fills.current[0]) fills.current[0]!.style.background = wcol;
    winLabel.style.fontWeight = wh > 0.3 ? "600" : "400";

    // ---- the winning label flies out of the table into the output card ----
    const handoff = smooth(0.885, 0.925, p);
    if (handoff > 0.0001 && outword.current) {
      const rowExit = smooth(0.885, 0.908, p);
      setOp(winRank, 1 - rowExit);
      setOp(winIcon, 1 - rowExit);
      setOp(winBar, 1 - rowExit);
      setOp(winScore, 1 - rowExit);
      win.style.position = "relative";
      win.style.zIndex = "7";

      // cream → green as the word lifts off the table
      const cg = smooth(0.885, 0.905, p);
      winLabel.style.color = `rgb(${Math.round(lerp(228, 121, cg))},${Math.round(
        lerp(225, 229, cg)
      )},${Math.round(lerp(205, 155, cg))})`;

      // FLIP: measure both boxes, translate by the zoom-corrected delta
      winLabel.style.transformOrigin = "0% 50%";
      winLabel.style.transform = "none";
      const from = winLabel.getBoundingClientRect();
      const to = outword.current.getBoundingClientRect();
      const dx = ((to.left - from.left) / zoom) * handoff;
      const dy = ((to.top + to.height / 2 - (from.top + from.height / 2)) / zoom) * handoff;
      winLabel.style.transform = `translate(${dx}px,${dy}px) scale(${lerp(1, 13 / 16, handoff)})`;

      // hand the word off to the card's own copy
      const cross = smooth(0.915, 0.93, p);
      setOp(winLabel, 1 - cross);
    } else {
      win.style.position = "";
      win.style.zIndex = "";
      winLabel.style.transform = "none";
      winLabel.style.color = "";
      setOp(winLabel, 1);
      setOp(winRank, 1);
      setOp(winIcon, 1);
      setOp(winBar, 1);
      setOp(winScore, 1);
    }

    // ---- output card ----
    setOp(
      output.current,
      kf(p, [
        [0.885, 0],
        [0.915, 1],
        [1, 1],
      ])
    );
    setOp(
      outsub.current,
      kf(p, [
        [0.885, 0],
        [0.925, 1],
        [1, 1],
      ])
    );
    setOp(outword.current, smooth(0.915, 0.93, p));

    // ---- closing sentence + result cards, both built right to left ----
    setOp(
      s5box.current,
      kf(p, [
        [0.9, 0],
        [0.935, 1],
        [1, 1],
      ])
    );
    const n = words.current.length;
    words.current.forEach((w, i) => {
      if (!w) return;
      const from = 0.9 + (n - 1 - i) * 0.005;
      const wr = smooth(from, from + 0.03, p);
      setOp(w, wr);
      w.style.filter = `blur(${(1 - wr) * 4}px)`;
    });
    rcards.current.forEach((c, i) => {
      if (!c) return;
      const from = 0.9 + (3 - i) * 0.013;
      const on = smooth(from, from + 0.04, p);
      const base = kf(p, [
        [0.7, 0],
        [0.74, 0.14],
        [0.9, 0.14],
      ]);
      setOp(c, Math.max(base, on));
      c.style.borderColor = `rgba(121,229,155,${lerp(0.2, 0.65, on)})`;
      c.style.boxShadow = on > 0.4 ? `0 0 22px rgba(121,229,155,${0.22 * on})` : "none";
    });

    setOp(hint.current, p > 0.02 ? 0 : 1);
  }

  useImperativeHandle(ref, () => ({
    update(p, t) {
      const R = root.current;
      // offsetWidth is 0 while the compact variant owns the viewport.
      if (!R || R.offsetWidth === 0) return;

      // Read the display scale once, before any style writes this frame.
      const zoom = R.getBoundingClientRect().width / W || 1;
      const c = cv.current;
      const want = pixelRatio() * zoom;
      if (c && (!ctx.current || ctx.current.canvas !== c || Math.abs(ratio.current - want) > 0.01)) {
        ctx.current = fitCanvas(c, W, H, want);
        ratio.current = want;
      }
      draw(p, t);
      paint(p, zoom);
    },
  }));

  return (
    <div ref={root} className={styles.root}>
      <canvas ref={cv} className={styles.canvas} aria-hidden="true" />

      <svg className={styles.overlay} viewBox="0 0 1600 900" aria-hidden="true">
        <path
          ref={put(arcs, 0)}
          d="M 40 152 Q 220 92 372 258"
          fill="none"
          stroke="#79E59B"
          strokeWidth="1.4"
          strokeDasharray="2 8"
          strokeLinecap="round"
          opacity="0"
        />
        <path
          ref={put(arcs, 1)}
          d="M 1560 152 Q 1380 92 1228 258"
          fill="none"
          stroke="#F64C6F"
          strokeWidth="1.4"
          strokeDasharray="2 8"
          strokeLinecap="round"
          opacity="0"
        />
        <circle ref={ldot} cx="40" cy="152" r="6" fill="#79E59B" opacity="0" />
        <circle ref={rdot} cx="1560" cy="152" r="6" fill="#F64C6F" opacity="0" />
        <path
          ref={put(conns, 0)}
          d="M 800 249 L 800 400"
          fill="none"
          stroke="#79E59B"
          strokeWidth="1.6"
          strokeDasharray="2 9"
          strokeLinecap="round"
          opacity="0"
        />
        <circle
          ref={put(conns, 1)}
          cx="800"
          cy="249"
          r="5"
          fill="none"
          stroke="#79E59B"
          strokeWidth="1.6"
          opacity="0"
        />
        <circle
          ref={put(conns, 2)}
          cx="800"
          cy="400"
          r="5"
          fill="none"
          stroke="#79E59B"
          strokeWidth="1.6"
          opacity="0"
        />
      </svg>

      <div ref={eyebrow} className={`mono ${styles.eyebrow}`}>
        Como trabalhamos
      </div>
      <h2 ref={title} className={styles.title}>
        Da <span className={styles.green}>informação</span> à{" "}
        <span className={styles.pink}>decisão</span>.
      </h2>

      <div className={styles.blocks}>
        {BLOCKS.map((b, i) => (
          <div key={b.n} className={styles.blockCell}>
            <div ref={put(blocks, i)} className={styles.block} style={{ width: b.w }}>
              <span ref={put(bicons, i)} className={styles.blockIcon}>
                <Icon name={b.icon} size={20} />
              </span>
              <span className={`mono ${styles.blockNum}`}>{b.n}</span>
              <span className={styles.blockLabel}>{b.label}</span>
            </div>
            {i < BLOCKS.length - 1 && (
              <div className={styles.blockConn}>
                <span ref={put(blines, i)} className={styles.blockLine} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div ref={panel} className={styles.panel} />
      <div ref={nucleo} className={`mono ${styles.nucleo}`}>
        <Icon name="fork" size={16} />
        NÚCLEO DE DECISÃO
      </div>

      <div ref={s3} className={styles.table}>
        <div ref={s3head} className={`mono ${styles.tableHead}`}>
          Caminhos analisados
        </div>
        {OPTIONS.map((o, i) => (
          <div key={o.rank} ref={put(rows, i)} className={styles.row}>
            <span ref={put(ranks, i)} className={`mono ${styles.rank}`}>
              {o.rank}
            </span>
            <span ref={put(icons, i)} className={styles.rowIcon}>
              <Icon name={o.icon} size={18} />
            </span>
            <span ref={put(labels, i)} className={styles.rowLabel}>
              {o.label}
            </span>
            <span ref={put(bars, i)} className={styles.bar}>
              <span ref={put(fills, i)} className={styles.barFill} />
            </span>
            <span ref={put(scores, i)} className={`mono ${styles.score}`} />
          </div>
        ))}
      </div>

      <div ref={output} className={styles.output}>
        <div ref={outsub} className={`mono ${styles.outputSub}`}>
          <Icon name="check" size={15} strokeWidth={2} />
          <span ref={outword} className={styles.outputWord}>
            Automatizar processos
          </span>
          <span>· 92</span>
        </div>
        <div className={styles.outputTitle}>Decisões melhores</div>
      </div>

      <div ref={s5box} className={styles.sentenceBox}>
        <div className={`mono ${styles.sentence}`}>
          {SENTENCE.map((w, i) => (
            <span
              key={w + i}
              ref={put(words, i)}
              className={i >= SENTENCE_ACCENT_FROM ? styles.pink : undefined}
            >
              {w}{" "}
            </span>
          ))}
        </div>
      </div>

      {RESULT_CARDS.map((c, i) => (
        <div
          key={c.label}
          ref={put(rcards, i)}
          className={styles.rcard}
          style={{ left: 261 + i * 276 }}
        >
          <div className={styles.rcardTop}>
            <span className={styles.green}>
              <Icon name={c.icon} size={22} strokeWidth={1.5} />
            </span>
            <span className={styles.rcardDash}>—</span>
          </div>
          <div className={styles.rcardLabel}>{c.label}</div>
        </div>
      ))}

      <div ref={hint} className={`mono ${styles.hint}`}>
        Role para avançar
      </div>
    </div>
  );
});
