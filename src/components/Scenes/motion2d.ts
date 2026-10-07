/*
 * DevButter · motion elements (canvas 2D, zero dependencies).
 * Port of docs/design/assets/motion-elements.js — only the sketches the site uses:
 *   attention (prototype #c1, fallback for the 3D scene) · scope (#c2, 2D only) ·
 *   neural (#c4, fallback for the 3D scene).
 * One shared loop that only runs while some mounted canvas is visible and unpaused;
 * 60 fps cap; respects prefers-reduced-motion (single still frame).
 */
import { mulberry32 } from "./prng";
import type { SceneApi, SceneKind } from "./types";

/* ---------- brand colours (engine data, mirrors the tokens) ---------- */
const G = "#79e59b"; // --db-green
const PG = "#ff4fa3"; // --db-pink-glow
const G_RGB = "121,229,155"; // --db-green
const GG_RGB = "0,210,106"; // --db-green-glow
const P_RGB = "246,76,111"; // --db-pink
const PG_RGB = "255,79,163"; // --db-pink-glow
const GREY_RGB = "156,166,181"; // --db-text-secondary #9ca6b5
const INK_RGB = "245,247,251"; // --db-text-primary #f5f7fb
const MUTED_RGB = "90,98,114"; // --db-text-muted #5a6272
const SURFACE = "rgba(11,15,24,1)"; // --db-surface #0b0f18
const DIM = "rgba(255,255,255,.09)"; // faint white, ≈ --db-border family
const rgba = (rgb: string, a: number | string): string => "rgba(" + rgb + "," + a + ")";

/** cheap smooth field, no library */
function field(x: number, y: number, t: number): number {
  return (
    Math.sin(x * 0.011 + t * 0.21) * Math.cos(y * 0.013 - t * 0.17) +
    0.5 * Math.sin(x * 0.026 - y * 0.019 + t * 0.33) +
    0.25 * Math.cos(x * 0.047 + y * 0.041 - t * 0.5)
  );
}

/* ---------- sketch plumbing ---------- */
interface Surface {
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  t: number;
}
interface Sketch {
  onresize?(): void;
  draw(still: boolean): void;
}

/* 01 — attention field */
function attention(s: Surface): Sketch {
  let nodes: { x: number; y: number; j: number }[] = [];
  const rnd = mulberry32(7);
  return {
    onresize() {
      nodes = [];
      const cols = Math.max(5, Math.round(s.w / 64)),
        rows = 4;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) nodes.push({ x: ((c + 0.5) / cols) * s.w, y: ((r + 0.5) / rows) * s.h, j: rnd() * 6.28 });
    },
    draw() {
      const ctx = s.ctx,
        t = s.t;
      ctx.clearRect(0, 0, s.w, s.h);
      const qx = s.w * (0.5 + 0.42 * Math.sin(t * 0.32)),
        qy = s.h * (0.5 + 0.3 * Math.cos(t * 0.24));
      for (const n of nodes) {
        const d = Math.hypot(n.x - qx, n.y - qy),
          wg = Math.max(0, 1 - d / (s.w * 0.42));
        if (wg > 0.06) {
          ctx.strokeStyle = rgba(G_RGB, (wg * wg * 0.5).toFixed(3));
          ctx.lineWidth = 0.5 + wg * 1.6;
          ctx.beginPath();
          ctx.moveTo(qx, qy);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }
      for (const n of nodes) {
        const d = Math.hypot(n.x - qx, n.y - qy),
          wg = Math.max(0, 1 - d / (s.w * 0.42));
        ctx.fillStyle = wg > 0.5 ? G : DIM;
        const rr = 1.5 + wg * 2.2 + Math.sin(t * 1.4 + n.j) * 0.3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, rr, 0, 6.283);
        ctx.fill();
      }
      ctx.fillStyle = PG;
      ctx.beginPath();
      ctx.arc(qx, qy, 4.4, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = rgba(PG_RGB, ".35");
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(qx, qy, 9 + Math.sin(t * 2) * 2, 0, 6.283);
      ctx.stroke();
    },
  };
}

/* 02 — scope flow field: chaotic neon pink (passes behind the text, faded) → green flow in 3 channels */
interface Particle {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  fl: number;
  k: number;
  prog: number;
  e: number;
}
function scope(s: Surface, maskRoot: HTMLElement | null): Sketch {
  let ps: Particle[] = [];
  const rnd = mulberry32(21),
    cvs = s.cv,
    rng = document.createRange();
  const sm = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const neon = (e: number, l: number, a: number) =>
    "hsla(" + (345 - 205 * e).toFixed(1) + ",100%," + l + "%," + Math.max(0, Math.min(1, a)).toFixed(3) + ")";
  const spawn = (p: Particle) => {
    p.x = -10 - rnd() * 40;
    p.y = rnd() * s.h;
    p.vx = 1.2;
    p.vy = 0;
    p.life = 0;
    p.fl = rnd() * 10;
    p.k = rnd();
  };
  const newParticle = (): Particle => {
    const p: Particle = { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, life: 0, fl: 0, k: 0, prog: 0, e: 0 };
    spawn(p);
    return p;
  };
  const lanes = (): [number, number, number] => [s.h * 0.3, s.h * 0.5, s.h * 0.7];
  function advance(p: Particle, t: number, ln: [number, number, number]) {
    p.px = p.x;
    p.py = p.y;
    p.prog = Math.min(1, Math.max(0, p.x / (s.w * 0.94)));
    const e = sm(0.5, 0.82, p.prog);
    p.e = e;
    const a = (field(p.x, p.y, t) + 0.6 * field(p.y * 1.7, p.x * 1.3, t * 1.6 + p.k * 9)) * 2.4;
    let near = ln[0];
    for (let L = 1; L < 3; L++) if (Math.abs(ln[L] - p.y) < Math.abs(near - p.y)) near = ln[L];
    const tvx = 1.25 + p.prog * 2.1 + Math.cos(a) * 2.1 * (1 - e);
    const tvy = Math.sin(a) * 2.8 * (1 - e) + (near - p.y) * 0.075 * e;
    p.vx += (tvx - p.vx) * 0.16;
    p.vy += (tvy - p.vy) * (0.16 + 0.3 * e);
    if (Math.random() < 0.025 * (1 - e)) {
      p.vx += (Math.random() - 0.5) * 6;
      p.vy += (Math.random() - 0.5) * 6;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.life++;
    /* conserved: only leaves through the channels on the right; top/bottom bounce back */
    if (p.y < 4) {
      p.y = 4;
      p.vy = Math.abs(p.vy);
    } else if (p.y > s.h - 4) {
      p.y = s.h - 4;
      p.vy = -Math.abs(p.vy);
    }
    if (p.x > s.w + 8) {
      spawn(p);
      p.px = p.x;
      p.py = p.y;
    }
  }
  /* fade feathered behind every [data-fx-mask] text under maskRoot (blurred off-canvas shadow, destination-out) */
  function mask(ctx: CanvasRenderingContext2D) {
    if (maskRoot) {
      const els = maskRoot.querySelectorAll("[data-fx-mask]"),
        cr = cvs.getBoundingClientRect(),
        dpr = cvs.width / s.w,
        OFF = 30000;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
      ctx.shadowOffsetX = OFF;
      ctx.shadowOffsetY = 0;
      ctx.shadowColor = "rgba(0,0,0,.88)";
      for (const el of els) {
        rng.selectNodeContents(el);
        const r = rng.getBoundingClientRect();
        if (r.width < 1) continue;
        const f = r.height > 60 ? 28 : 18,
          pad = 8;
        ctx.shadowBlur = f * dpr;
        ctx.fillRect((r.left - cr.left - pad) * dpr - OFF, (r.top - cr.top - pad) * dpr, (r.width + pad * 2) * dpr, (r.height + pad * 2) * dpr);
      }
      ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    let g = ctx.createLinearGradient(0, 0, 80, 0);
    g.addColorStop(0, "rgba(0,0,0,.9)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 80, s.h);
    g = ctx.createLinearGradient(0, 0, 0, 28);
    g.addColorStop(0, "rgba(0,0,0,.8)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s.w, 28);
    g = ctx.createLinearGradient(0, s.h, 0, s.h - 28);
    g.addColorStop(0, "rgba(0,0,0,.8)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, s.h - 28, s.w, 28);
    ctx.restore();
  }
  function frame(t: number) {
    const ctx = s.ctx,
      ln = lanes();
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,.11)";
    ctx.fillRect(0, 0, s.w, s.h);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let k = 0; k < 3; k++) {
      /* the defined channels */
      ctx.strokeStyle = neon(1, 55, 0.012);
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(s.w * 0.7, ln[k]);
      ctx.lineTo(s.w, ln[k]);
      ctx.stroke();
      ctx.fillStyle = neon(1, 62, 0.09);
      ctx.fillRect(s.w - 3, ln[k] - 10, 3, 20);
    }
    for (const p of ps) {
      advance(p, t, ln);
      if (Math.hypot(p.x - p.px, p.y - p.py) > 30) continue;
      const e = p.e,
        flick = 0.84 + 0.16 * Math.abs(Math.sin(t * 17 + p.fl * 9) * Math.sin(t * 6.3 + p.fl * 3));
      const fade = Math.min(1, p.life / 14) * (flick + (1 - flick) * e);
      const snap = 1 + 0.9 * Math.exp(-Math.pow((e - 0.75) / 0.12, 2));
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = neon(e, 56, 0.16 * fade * snap);
      ctx.lineWidth = 4.2;
      ctx.stroke();
      ctx.strokeStyle = neon(e, 76, 0.85 * fade * snap);
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
    /* electric arcs jump between close charges while still chaotic */
    let cnt = 0;
    for (let q = 0; q < 60 && cnt < 10; q++) {
      const A = ps[(Math.random() * ps.length) | 0];
      if (!A || A.e > 0.2 || A.life < 20) continue;
      for (let j = 0; j < ps.length && cnt < 10; j++) {
        const B = ps[j];
        if (B === A || B.e > 0.2 || B.life < 20) continue;
        const dx = B.x - A.x,
          dy = B.y - A.y,
          d = Math.hypot(dx, dy);
        if (d > 46 || d < 6 || Math.random() > 0.25) continue;
        cnt++;
        const st = 1 - d / 46,
          nx = -dy / d,
          ny = dx / d;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        for (let u = 1; u < 5; u++) {
          const o = (Math.random() - 0.5) * d * 0.4;
          ctx.lineTo(A.x + (dx * u) / 5 + nx * o, A.y + (dy * u) / 5 + ny * o);
        }
        ctx.lineTo(B.x, B.y);
        ctx.strokeStyle = neon(0, 58, 0.3 * st);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = neon(0, 88, 0.95 * st);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
    ctx.restore();
    mask(ctx);
  }
  return {
    onresize() {
      ps = [];
      const N = Math.min(720, Math.round(s.w * 0.62));
      for (let i = 0; i < N; i++) {
        const p = newParticle();
        /* seed across the full width so the still frame shows the whole journey */
        p.x = rnd() * s.w * 1.04;
        p.life = 20 + rnd() * 200;
        p.px = p.x;
        p.py = p.y;
        ps.push(p);
      }
      const ln = lanes();
      for (let k = 0; k < 90; k++) for (const p of ps) advance(p, k * 0.016, ln);
    },
    draw(still) {
      if (still) {
        s.ctx.clearRect(0, 0, s.w, s.h);
        for (let k = 0; k < 40; k++) frame((s.t || 0) + k * 0.016);
        return;
      }
      frame(s.t);
    },
  };
}

/* 04 — neural net: a real forward pass, then backprop.
   Everything derives from t, so the first painted frame lands mid-pass —
   the still frame shows the network working, never an idle diagram. */
function neural(s: Surface, labelFont: string): Sketch {
  const SHAPE = [5, 9, 9, 3];
  const W: number[][][] = []; /* W[L][i][j] — weights, fixed for the life of the net */
  let pos: { x: number; y: number }[][] = [];
  const FWD = 3.15,
    HOLD = 0.75,
    BACK = 1.6,
    REST = 0.6;
  const CYCLE = FWD + HOLD + BACK + REST;
  {
    const rnd = mulberry32(4242);
    for (let L = 0; L < SHAPE.length - 1; L++) {
      W[L] = [];
      for (let i = 0; i < SHAPE[L]; i++) {
        W[L][i] = [];
        for (let j = 0; j < SHAPE[L + 1]; j++) W[L][i][j] = rnd() * 2 - 1;
      }
    }
  }
  /* activations for a given cycle index — same index, same network state */
  let cacheIdx = -1,
    A: number[][] = [],
    winner = 0;
  function activations(idx: number) {
    if (idx === cacheIdx) return;
    cacheIdx = idx;
    const rnd = mulberry32(idx * 7919 + 13);
    A = [[]];
    for (let i = 0; i < SHAPE[0]; i++) A[0][i] = 0.25 + rnd() * 0.75;
    for (let L = 0; L < SHAPE.length - 1; L++) {
      A[L + 1] = [];
      for (let j = 0; j < SHAPE[L + 1]; j++) {
        let sum = 0;
        for (let k = 0; k < SHAPE[L]; k++) sum += W[L][k][j] * A[L][k];
        A[L + 1][j] = 1 / (1 + Math.exp(-sum * 1.3)); /* sigmoid */
      }
    }
    let best = -1;
    winner = 0;
    const last = SHAPE.length - 1;
    for (let o = 0; o < SHAPE[last]; o++)
      if (A[last][o] > best) {
        best = A[last][o];
        winner = o;
      }
  }
  const ease = (p: number) => (p < 0 ? 0 : p > 1 ? 1 : 1 - Math.pow(1 - p, 3));
  return {
    onresize() {
      pos = [];
      const padX = Math.max(26, s.w * 0.085),
        padY = 26;
      for (let L = 0; L < SHAPE.length; L++) {
        pos[L] = [];
        const x = padX + (s.w - padX * 2) * (SHAPE.length === 1 ? 0 : L / (SHAPE.length - 1));
        const n = SHAPE[L];
        for (let i = 0; i < n; i++) {
          const y = n === 1 ? s.h / 2 : padY + (s.h - padY * 2) * (i / (n - 1));
          pos[L][i] = { x, y };
        }
      }
    },
    draw() {
      const ctx = s.ctx,
        t = s.t + 2.1; /* offset so frame 1 is mid-forward */
      if (!pos.length) return;
      const idx = Math.floor(t / CYCLE),
        ph = t - idx * CYCLE;
      activations(idx);
      ctx.clearRect(0, 0, s.w, s.h);

      const nL = SHAPE.length;
      /* which transition the wavefront is crossing, and how far through it */
      let tr = -1,
        p = 0;
      if (ph < FWD) {
        const sg = FWD / (nL - 1);
        tr = Math.min(nL - 2, Math.floor(ph / sg));
        p = ease((ph - tr * sg) / sg);
      }
      const backP = ph >= FWD + HOLD && ph < FWD + HOLD + BACK ? (ph - FWD - HOLD) / BACK : -1;

      /* ---- edges ---- */
      for (let L = 0; L < nL - 1; L++) {
        const done = tr > L || ph >= FWD;
        const live = tr === L;
        for (let i = 0; i < SHAPE[L]; i++) {
          for (let j = 0; j < SHAPE[L + 1]; j++) {
            const a = pos[L][i],
              b = pos[L + 1][j],
              w = W[L][i][j];
            const st = Math.abs(w) * A[L][i]; /* how much this edge carries */
            let al: number;
            if (done) al = 0.05 + st * 0.34;
            else if (live) al = (0.05 + st * 0.34) * p;
            else al = 0.035;
            /* backward sweep repaints the edges it passes, right to left */
            if (backP >= 0) {
              const bx = s.w - s.w * 1.06 * ease(backP);
              const mid = (a.x + b.x) / 2,
                near = 1 - Math.min(1, Math.abs(mid - bx) / (s.w * 0.16));
              if (near > 0) {
                ctx.strokeStyle = rgba(P_RGB, (near * (0.1 + st * 0.5)).toFixed(3));
                ctx.lineWidth = 0.6 + near * st * 1.9;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
              }
            }
            ctx.strokeStyle = rgba(w < 0 ? GREY_RGB : G_RGB, al.toFixed(3));
            ctx.lineWidth = 0.55 + st * 1.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        /* ---- travelling pulses, only on the edges actually carrying signal ---- */
        if (live) {
          for (let i = 0; i < SHAPE[L]; i++) {
            for (let j = 0; j < SHAPE[L + 1]; j++) {
              const w = W[L][i][j],
                st = Math.abs(w) * A[L][i];
              if (st < 0.42) continue;
              const a = pos[L][i],
                b = pos[L + 1][j];
              const px = a.x + (b.x - a.x) * p,
                py = a.y + (b.y - a.y) * p;
              ctx.fillStyle = w < 0 ? rgba(GREY_RGB, ".75") : rgba(GG_RGB, ".95");
              ctx.beginPath();
              ctx.arc(px, py, 1.5 + st * 1.1, 0, 6.283);
              ctx.fill();
            }
          }
        }
      }

      /* ---- neurons ---- */
      const seg2 = FWD / (nL - 1);
      for (let L = 0; L < nL; L++) {
        const lit = L === 0 ? 1 : ph >= FWD ? 1 : ease((ph - (L - 1) * seg2) / seg2);
        for (let i = 0; i < SHAPE[L]; i++) {
          const a = pos[L][i],
            act = A[L][i] * lit;
          const r = 3.1 + act * 3.4;
          ctx.fillStyle = SURFACE;
          ctx.beginPath();
          ctx.arc(a.x, a.y, r + 1.6, 0, 6.283);
          ctx.fill();
          if (act > 0.05) {
            ctx.fillStyle = rgba(G_RGB, (0.1 + act * 0.32).toFixed(3));
            ctx.beginPath();
            ctx.arc(a.x, a.y, r + 2.8 + act * 2.4, 0, 6.283);
            ctx.fill();
          }
          ctx.fillStyle = act > 0.55 ? G : rgba(G_RGB, (0.24 + act * 0.5).toFixed(3));
          ctx.beginPath();
          ctx.arc(a.x, a.y, r, 0, 6.283);
          ctx.fill();
          ctx.strokeStyle = rgba(INK_RGB, (0.1 + act * 0.24).toFixed(3));
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.arc(a.x, a.y, r, 0, 6.283);
          ctx.stroke();
        }
      }

      /* ---- the output that won ---- */
      if (ph >= FWD * 0.96) {
        const o = pos[nL - 1][winner];
        const pulse = ph < FWD + HOLD ? ease((ph - FWD * 0.96) / 0.5) : 1;
        ctx.strokeStyle = rgba(PG_RGB, (0.75 * pulse).toFixed(3));
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(o.x, o.y, 10 + Math.sin(t * 3) * 1.3, 0, 6.283);
        ctx.stroke();
      }

      /* ---- phase label: says which mechanism you are looking at ---- */
      ctx.font = labelFont;
      let lbl: string, col: string;
      if (ph < FWD) {
        lbl = "FORWARD PASS · CAMADA " + (tr + 1) + "/" + (nL - 1);
        col = rgba(G_RGB, ".85");
      } else if (ph < FWD + HOLD) {
        lbl = "SAÍDA " + (winner + 1) + " · " + A[nL - 1][winner].toFixed(2);
        col = rgba(PG_RGB, ".9");
      } else if (backP >= 0) {
        lbl = "BACKPROP · AJUSTANDO PESOS";
        col = rgba(P_RGB, ".85");
      } else {
        lbl = "PRÓXIMA AMOSTRA";
        col = rgba(MUTED_RGB, ".9");
      }
      ctx.fillStyle = col;
      ctx.fillText(lbl, 14, s.h - 12);
    },
  };
}

/* ---------- shared loop ---------- */
interface Mount {
  s: Surface;
  sketch: Sketch;
  visible: boolean;
  paused: boolean;
}
const mounts = new Set<Mount>();
let raf = 0,
  lastMs = 0;
let reduceCache: boolean | null = null;
const reduceMotion = (): boolean =>
  (reduceCache ??= typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const isActive = (m: Mount) => m.visible && !m.paused;

function tick(ms: number): void {
  raf = 0;
  let any = false;
  for (const m of mounts) if (isActive(m)) any = true;
  if (!any) return;
  raf = requestAnimationFrame(tick);
  if (ms - lastMs < 10.5) return; /* ~60 fps cap: 120/144 Hz don't double the cost or the speed */
  lastMs = ms;
  const t = ms / 1000;
  for (const m of mounts) {
    if (!isActive(m)) continue;
    m.s.t = t;
    m.sketch.draw(false);
  }
}
function sync(): void {
  let any = false;
  for (const m of mounts) if (isActive(m)) any = true;
  if (any && !raf && !reduceMotion()) raf = requestAnimationFrame(tick);
  else if (!any && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}

/** Resolve the next/font family for canvas text (CSS vars don't work in ctx.font). */
function monoFont(cv: HTMLCanvasElement): string {
  const fam = getComputedStyle(cv).getPropertyValue("--font-geist-mono").trim();
  return '500 9.5px ' + (fam ? fam + ", " : "") + '"Geist Mono", monospace';
}

const NOOP_API: SceneApi = { pause: () => {}, destroy: () => {} };

/**
 * Mount a 2D sketch on `canvas`. For `scope`, the text kept clear of particles is every
 * `[data-fx-mask]` element under `opts.maskRoot` (default: the canvas's parent).
 */
export function mountMotion2D(
  canvas: HTMLCanvasElement,
  kind: SceneKind,
  opts?: { maskRoot?: HTMLElement | null },
): SceneApi {
  const ctx = canvas.getContext("2d");
  if (!ctx) return NOOP_API;
  const reduce = reduceMotion();
  const s: Surface = { cv: canvas, ctx, w: 0, h: 0, t: reduce ? 1.2 : 0 };
  const sketch =
    kind === "attention"
      ? attention(s)
      : kind === "scope"
        ? scope(s, opts?.maskRoot ?? canvas.parentElement)
        : neural(s, monoFont(canvas));
  const m: Mount = { s, sketch, visible: false, paused: false };
  let destroyed = false;

  const resize = () => {
    if (destroyed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const r = canvas.getBoundingClientRect();
    s.w = Math.max(1, Math.round(r.width));
    s.h = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(s.w * dpr);
    canvas.height = Math.round(s.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sketch.onresize?.();
    sketch.draw(true);
  };
  resize();

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(resize);
    ro.observe(canvas);
  } else window.addEventListener("resize", resize);

  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(
      (es) => {
        m.visible = es[es.length - 1].isIntersecting;
        sync();
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);
  } else m.visible = true;

  mounts.add(m);
  sync();

  return {
    pause(b) {
      if (destroyed) return;
      m.paused = !!b;
      sync();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener("resize", resize);
      mounts.delete(m);
      sync();
    },
  };
}
