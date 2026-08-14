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

export function makeSeeds(n = 40) {
  return Array.from({ length: n }, () => Math.random());
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

/** Scene boundaries (upper bound, number, label) used by the scrubber readout. */
export const SCENES: readonly (readonly [number, string, string])[] = [
  [0.47, "1", "BLOCOS APARECEM"],
  [0.6, "2", "REDE NEURAL"],
  [0.62, "3", "OPÇÕES CALCULADAS"],
  [0.945, "4", "CAMINHO SELECIONADO"],
  [1.01, "5", "MENSAGEM FINAL"],
];

export function sceneAt(p: number) {
  for (const s of SCENES) if (p < s[0]) return s;
  return SCENES[SCENES.length - 1];
}

// ---- neural network ----

/** Three columns of four nodes, inset inside the panel rect. */
export function computeNodes(rect: Rect) {
  const px = rect.w * 0.11;
  const py = rect.h * 0.15;
  const L = rect.x + px;
  const R = rect.x + rect.w - px;
  const M = rect.x + rect.w / 2;
  const y = (i: number) => rect.y + py + i * ((rect.h - 2 * py) / 3);
  const col = (x: number) => [0, 1, 2, 3].map((i) => ({ x, y: y(i) }));
  return { left: col(L), mid: col(M), right: col(R) };
}

type NetOpts = { alpha: number; scale: number; t: number; p: number; seeds: number[] };

/**
 * Fully connected green→pink→green graph with particles running the edges.
 * `scale` is the dolly: >1 pushes the network past the viewer, 1 seats it in the panel.
 */
export function drawNetwork(ctx: CanvasRenderingContext2D, rect: Rect, o: NetOpts) {
  const { alpha, scale, t, p, seeds } = o;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const cam = (pt: Point) => ({ x: cx + (pt.x - cx) * scale, y: cy + (pt.y - cy) * scale });
  const N = computeNodes(rect);

  ctx.save();
  ctx.globalAlpha = alpha;

  const drawEdges = (from: Point[], to: Point[], color: string, si: number) => {
    for (let a = 0; a < from.length; a++) {
      for (let b = 0; b < to.length; b++) {
        const A = cam(from[a]);
        const B = cam(to[b]);
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.strokeStyle = `rgba(${color},0.16)`;
        ctx.lineWidth = 0.9 * scale;
        ctx.stroke();
        const seed = seeds[(si + a * 4 + b) % seeds.length];
        for (let k = 0; k < 2; k++) {
          const ph = frac(seed + k * 0.5 + p * 1.4 + t * 0.05);
          ctx.beginPath();
          ctx.arc(A.x + (B.x - A.x) * ph, A.y + (B.y - A.y) * ph, 1.7 * scale, 0, 7);
          ctx.fillStyle = `rgba(${color},0.9)`;
          ctx.shadowBlur = 8 * scale;
          ctx.shadowColor = `rgba(${color},0.9)`;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }
  };
  drawEdges(N.left, N.mid, GREEN, 0);
  drawEdges(N.mid, N.right, PINK, 12);

  const drawNode = (pt: Point, color: string, i: number) => {
    const P = cam(pt);
    const r = 20 * scale * (1 + 0.06 * Math.sin(t * 2 + i));
    ctx.beginPath();
    ctx.arc(P.x, P.y, r * 0.55, 0, 7);
    ctx.fillStyle = `rgba(${color},0.10)`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(P.x, P.y, r, 0, 7);
    ctx.strokeStyle = `rgba(${color},0.95)`;
    ctx.lineWidth = 3 * scale;
    ctx.shadowBlur = 20 * scale;
    ctx.shadowColor = `rgba(${color},0.9)`;
    ctx.stroke();
    ctx.shadowBlur = 0;
  };
  N.left.forEach((n, i) => drawNode(n, GREEN, i));
  N.mid.forEach((n, i) => drawNode(n, PINK, i + 10));
  N.right.forEach((n, i) => drawNode(n, GREEN, i + 20));

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
