// Shared model for the "Da informação à decisão" storyboard.
// Ported from the Claude Design source (Da informacao a decisao.dc.html) — the
// easing helpers and the network drawing keep the original math so the timing
// reads the same as the storyboard preview.

export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Keys = readonly (readonly [number, number])[];

/** Imperative surface each stage exposes to the scroll driver. */
export type StageHandle = { update: (p: number, t: number) => void };

export const GREEN = "121,229,155";
export const PINK = "246,76,111";

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const frac = (x: number) => x - Math.floor(x);

/** Smoothstep between two progress marks. */
export function smooth(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Piecewise-linear keyframe lookup: kf(p, [[at, value], ...]). */
export function kf(p: number, pts: Keys) {
  if (p <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    if (p <= pts[i + 1][0]) {
      const t = (p - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
      return lerp(pts[i][1], pts[i + 1][1], t);
    }
  }
  return pts[pts.length - 1][1];
}

export function quad(P0: Point, C: Point, P1: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * P0.x + 2 * u * t * C.x + t * t * P1.x,
    y: u * u * P0.y + 2 * u * t * C.y + t * t * P1.y,
  };
}

export function setOp(el: HTMLElement | SVGElement | null, v: number) {
  if (el) el.style.opacity = String(v);
}

// ---- content ----

export type BlockDef = { n: string; label: string; icon: IconName; w: number };

export const BLOCKS: BlockDef[] = [
  { n: "01", label: "Dados", icon: "database", w: 206 },
  { n: "02", label: "Modelos", icon: "graph", w: 206 },
  { n: "03", label: "Experiência", icon: "user", w: 230 },
  { n: "04", label: "Contexto", icon: "globe", w: 206 },
];

export type OptionDef = { rank: string; label: string; score: number; icon: IconName };

export const OPTIONS: OptionDef[] = [
  { rank: "01", label: "Automatizar processos", score: 92, icon: "bolt" },
  { rank: "02", label: "Conectar sistemas", score: 84, icon: "link" },
  { rank: "03", label: "Aplicar inteligência", score: 76, icon: "brain" },
  { rank: "04", label: "Melhorar experiências", score: 68, icon: "people" },
];

/** The closing sentence, built right-to-left. The last two words are pink. */
export const SENTENCE = [
  "Dados,",
  "modelos,",
  "experiência",
  "e",
  "contexto",
  "geram",
  "decisões",
  "melhores.",
];
export const SENTENCE_ACCENT_FROM = 6;

export const RESULT_CARDS: { label: string; icon: IconName }[] = [
  { label: "Projetos entregues", icon: "cube" },
  { label: "Sistemas em produção", icon: "database" },
  { label: "Interações com IA", icon: "brain" },
  { label: "Experiências interativas", icon: "grid" },
];

export type IconName =
  | "database"
  | "graph"
  | "user"
  | "globe"
  | "fork"
  | "bolt"
  | "link"
  | "brain"
  | "people"
  | "check"
  | "cube"
  | "grid";

// ---- neural network ----

type Node3 = { x: number; y: number; z: number; i: number };
type Edge3 = { a: Node3; b: Node3; l: number; s: number; pulse: boolean; bit: boolean };
type Net3 = { layers: Node3[][]; edges: Edge3[]; L: number };

/** Deterministic value hash — node jitter and edge traffic are seeded from it. */
const hash = (n: number) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);

let net: Net3 | null = null;

/**
 * Four layers along x, each a 3×3 plane of neurons in y (row) and z (depth).
 * Deterministic, so it is built once and shared by both stage variants.
 */
export function net3d(): Net3 {
  if (net) return net;
  const L = 4;
  const layers: Node3[][] = [];
  for (let l = 0; l < L; l++) {
    const col: Node3[] = [];
    for (let r = 0; r < 3; r++) {
      for (let d = 0; d < 3; d++) {
        const i = l * 9 + r * 3 + d;
        col.push({
          x: (l - 1.5) * 215 + (hash(i) - 0.5) * 30,
          y: (r - 1) * 88 + (hash(i + 50) - 0.5) * 30,
          z: (d - 1) * 130 + (hash(i + 100) - 0.5) * 44,
          i,
        });
      }
    }
    layers.push(col);
  }
  const edges: Edge3[] = [];
  for (let l = 0; l < L - 1; l++) {
    for (const a of layers[l]) {
      for (const b of layers[l + 1]) {
        const s = hash(a.i * 31.7 + b.i * 7.3);
        // a third of the edges carry traffic; a slice of those carry literal bits
        edges.push({ a, b, l, s, pulse: s < 0.34, bit: s > 0.22 && s < 0.34 });
      }
    }
  }
  net = { layers, edges, L };
  return net;
}

/** Layer ramp: green at the input side, pink at the output side. */
export function mixCol(m: number) {
  return `${Math.round(lerp(121, 246, m))},${Math.round(lerp(229, 76, m))},${Math.round(
    lerp(155, 111, m)
  )}`;
}

/** Focal length of the fake perspective camera. */
const FOCAL = 1050;

type NetOpts = { alpha: number; scale: number; t: number };

/**
 * The decision core: a 3D layered network under a slow orbit, with an activation
 * wave sweeping input → output and pulses running the edges.
 * `scale` is the dolly — >1 pushes the network past the viewer, 1 seats it in the panel.
 */
export function drawNetwork(ctx: CanvasRenderingContext2D, rect: Rect, o: NetOpts) {
  const { alpha, scale, t } = o;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const { layers, edges, L } = net3d();

  const yaw = 0.5 + Math.sin(t * 0.12) * 0.22;
  const pitch = 0.3 + Math.sin(t * 0.085) * 0.05;
  const cY = Math.cos(yaw);
  const sY = Math.sin(yaw);
  const cP = Math.cos(pitch);
  const sP = Math.sin(pitch);
  const project = (n: Node3) => {
    const x1 = n.x * cY - n.z * sY;
    const z1 = n.x * sY + n.z * cY;
    const y1 = n.y * cP - z1 * sP;
    const z2 = n.y * sP + z1 * cP;
    const k = FOCAL / (FOCAL + z2);
    return { x: cx + x1 * k * scale, y: cy + y1 * k * scale, k, z: z2 };
  };

  // activation wave sweeping the layers, brightening whatever it passes over
  const wx = lerp(-480, 520, frac(t * 0.22));
  const wave = (x: number) => {
    const d = (x - wx) / 120;
    return Math.exp(-d * d);
  };

  ctx.save();
  ctx.globalAlpha = alpha;

  for (const e of edges) {
    const A = project(e.a);
    const B = project(e.b);
    const dk = (A.k + B.k) / 2;
    const c = mixCol((e.l + 0.5) / (L - 1));
    const wb = wave((e.a.x + e.b.x) / 2);
    ctx.strokeStyle = `rgba(${c},${(0.04 + 0.09 * dk + 0.22 * wb).toFixed(3)})`;
    ctx.lineWidth = 0.7 * dk * scale;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
    if (!e.pulse) continue;

    const ph = frac(e.s * 7 + t * (0.22 + e.s * 0.3));
    const px = A.x + (B.x - A.x) * ph;
    const py = A.y + (B.y - A.y) * ph;
    const kk = A.k + (B.k - A.k) * ph;
    const tail = Math.max(0, ph - 0.1); // electric trail behind the pulse
    ctx.strokeStyle = `rgba(${c},0.4)`;
    ctx.lineWidth = 1.5 * kk * scale;
    ctx.beginPath();
    ctx.moveTo(A.x + (B.x - A.x) * tail, A.y + (B.y - A.y) * tail);
    ctx.lineTo(px, py);
    ctx.stroke();
    if (e.bit) {
      ctx.fillStyle = `rgba(${c},0.95)`;
      ctx.font = `${(10 * kk * scale).toFixed(1)}px "JetBrains Mono",monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(Math.floor(t * 5 + e.s * 40) % 2 ? "1" : "0", px, py);
    } else {
      ctx.beginPath();
      ctx.arc(px, py, 4.4 * kk * scale, 0, 7);
      ctx.fillStyle = `rgba(${c},0.16)`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 2 * kk * scale, 0, 7);
      ctx.fillStyle = `rgba(${c},0.95)`;
      ctx.fill();
    }
  }

  // nodes, painted far → near so the depth cue (size + brightness) reads
  const order = layers.flatMap((layer, l) => layer.map((n) => ({ q: project(n), n, l })));
  order.sort((a, b) => b.q.z - a.q.z);
  for (const { q, n, l } of order) {
    const c = mixCol(l / (L - 1));
    const boost = wave(n.x);
    const r = (6.5 + 3.5 * boost) * q.k * scale * (1 + 0.05 * Math.sin(t * 2 + n.i));
    ctx.beginPath();
    ctx.arc(q.x, q.y, r * 2.3, 0, 7);
    ctx.fillStyle = `rgba(${c},${(0.05 + 0.16 * boost).toFixed(3)})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(q.x, q.y, r, 0, 7);
    ctx.fillStyle = "rgba(11,15,24,0.92)";
    ctx.fill();
    ctx.strokeStyle = `rgba(${c},${(0.5 + 0.5 * boost).toFixed(3)})`;
    ctx.lineWidth = 1.6 * q.k * scale;
    ctx.shadowBlur = (7 + 15 * boost) * q.k;
    ctx.shadowColor = `rgba(${c},0.9)`;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(q.x, q.y, r * 0.42, 0, 7);
    ctx.fillStyle = `rgba(${c},${(0.35 + 0.6 * boost).toFixed(3)})`;
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Late scenes only: current running along the dashed connectors between the four
 * input blocks, then dropping out of each block into the network hub. Coordinates
 * are the desktop stage's own — the blocks are laid out to land on them.
 */
export function drawBlockFeed(ctx: CanvasRenderingContext2D, alpha: number, t: number) {
  const by = 319; // vertical centre of the block row
  const segs: [number, number][] = [
    [402, 522],
    [728, 848],
    [1078, 1198],
  ];
  const cols = [299, 625, 963, 1301]; // block centres
  const top = 348; // block row bottom
  const hub = { x: 800, y: 470 }; // network panel's top centre

  ctx.save();
  ctx.globalAlpha = alpha;

  segs.forEach(([x0, x1], si) => {
    const c = mixCol(si / 3);
    ctx.strokeStyle = `rgba(${c},0.22)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, by);
    ctx.lineTo(x1, by);
    ctx.stroke();
    for (let k = 0; k < 3; k++) {
      const ph = frac(si * 0.31 + k / 3 + t * 0.4);
      const x = x0 + (x1 - x0) * ph;
      const tail = x0 + (x1 - x0) * Math.max(0, ph - 0.16);
      ctx.strokeStyle = `rgba(${c},0.45)`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(tail, by);
      ctx.lineTo(x, by);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, by, 2.6, 0, 7);
      ctx.fillStyle = `rgba(${c},0.98)`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = `rgba(${c},0.9)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  cols.forEach((bx, i) => {
    const c = mixCol(i / 3);
    const P0 = { x: bx, y: top };
    const C = { x: bx, y: 420 };
    ctx.setLineDash([2, 8]);
    ctx.strokeStyle = `rgba(${c},0.2)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(P0.x, P0.y);
    for (let s = 1; s <= 16; s++) {
      const q = quad(P0, C, hub, s / 16);
      ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    for (let k = 0; k < 2; k++) {
      const q = quad(P0, C, hub, frac(i * 0.17 + k * 0.5 + t * 0.3));
      ctx.beginPath();
      ctx.arc(q.x, q.y, 2.2, 0, 7);
      ctx.fillStyle = `rgba(${c},0.95)`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgba(${c},0.9)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  ctx.restore();
}

/**
 * Points the canvas at a `w × h` drawing space backed by `w*ratio × h*ratio` pixels.
 * The stage is drawn in 1600×1780 design units but displayed much smaller, so the
 * caller folds its display scale into `ratio` — allocating the full design size would
 * cost several times more fill than anything ever reaches the screen.
 */
export function fitCanvas(cv: HTMLCanvasElement, w: number, h: number, ratio = pixelRatio()) {
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  cv.width = Math.max(1, Math.round(w * ratio));
  cv.height = Math.max(1, Math.round(h * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

export const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);
