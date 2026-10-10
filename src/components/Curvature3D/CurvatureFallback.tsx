import styles from "./Curvature3D.module.scss";

// Fallback estático da curvatura 3D: sem JS em execução, só SVG + CSS. A geometria é
// calculada uma vez no carregamento do módulo com o mesmo potencial do motor
// (−m/√(r²+ε²)), então o funil tem a mesma forma do poço da cena real.

const VIEW_W = 1600;
const VIEW_H = 900;
const CX = 800;
/** Linha do "horizonte" da membrana plana (borda externa). */
const BASE_Y = 360;
/** Pixels por unidade de mundo. */
const UNIT = 78;
/** Achatamento vertical da perspectiva (≈ sen da elevação da câmera). */
const TILT = 0.44;
const MASS = 3.8;
const EPS2 = 1.3225;
const R_MAX = 10;
const DEPTH_PX = 58;

const depth = (r: number) => MASS / Math.sqrt(r * r + EPS2);
const D_MIN = depth(R_MAX);
const D_MAX = depth(0.9);

/** Projeta um ponto polar (r, θ) da membrana no plano do SVG. */
function point(r: number, th: number): [number, number] {
  const x = CX + Math.cos(th) * r * UNIT;
  const y = BASE_Y + (depth(r) - D_MIN) * DEPTH_PX + Math.sin(th) * r * UNIT * TILT;
  return [x, y];
}

const f1 = (n: number) => n.toFixed(1);

/** Anéis de equipotencial: mais fundos (e mais rosados) perto da massa. */
const RINGS = [0.9, 1.3, 1.8, 2.4, 3.1, 3.9, 4.8, 5.8, 7, 8.4, 10].map((r) => {
  const t = (depth(r) - D_MIN) / (D_MAX - D_MIN);
  return {
    cy: f1(BASE_Y + (depth(r) - D_MIN) * DEPTH_PX),
    rx: f1(r * UNIT),
    ry: f1(r * UNIT * TILT),
    pink: t > 0.45,
    opacity: (0.22 + 0.55 * Math.sqrt(t)).toFixed(2),
  };
});

/** Raios da grade polar, descendo pelo funil até a garganta. */
const SPOKES = Array.from({ length: 24 }, (_, i) => {
  const th = (i / 24) * Math.PI * 2;
  const pts: string[] = [];
  for (let k = 0; k <= 28; k++) {
    const r = 0.9 + (R_MAX - 0.9) * Math.pow(k / 28, 1.6);
    const [x, y] = point(r, th);
    pts.push(`${f1(x)},${f1(y)}`);
  }
  return `M${pts.join("L")}`;
}).join(" ");

/** Massa principal assentada na garganta do poço. */
const MASS_R = 50;
const MASS_CY = BASE_Y + (D_MAX - D_MIN) * DEPTH_PX - MASS_R * 0.95;

/** Companheira verde na órbita excêntrica da cena 404 (r 4.4, ecc 0.72). */
const ORBIT_R = 4.4;
const ORBIT_ECC = 0.72;
const ORBIT_CY = BASE_Y + (depth(ORBIT_R) - D_MIN) * DEPTH_PX - 16;
const MOON_TH = 0.55;
const MOON_X = CX + Math.cos(MOON_TH) * ORBIT_R * UNIT;
const MOON_Y = ORBIT_CY + Math.sin(MOON_TH) * ORBIT_R * ORBIT_ECC * UNIT * TILT;

/** Céu: estrelas determinísticas (mesmo LCG do motor), iguais no servidor e no cliente. */
const STARS = (() => {
  let seed = 404;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 46 }, () => ({
    x: f1(rnd() * VIEW_W),
    y: f1(Math.pow(rnd(), 1.4) * VIEW_H * 0.62),
    r: f1(0.7 + rnd() * 1.6),
    o: (0.25 + rnd() * 0.6).toFixed(2),
  }));
})();

type CurvatureFallbackProps = {
  className?: string;
  /** Texto acessível; omitido quando `decorative`. */
  label?: string;
  /** Quando outro elemento já descreve a cena (ex.: por baixo do canvas). */
  decorative?: boolean;
};

export const CURVATURE_DEFAULT_LABEL = "Malha de curvatura 3D interativa";

/**
 * Versão estática da cena: céu escuro, massa rosa brilhante e a malha verde curvada em
 * funil. Aparece enquanto o WebGL carrega, com movimento reduzido e onde não há WebGL.
 */
export default function CurvatureFallback({
  className,
  label = CURVATURE_DEFAULT_LABEL,
  decorative = false,
}: CurvatureFallbackProps) {
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": label } as const);

  return (
    <div className={[styles.fallback, className].filter(Boolean).join(" ")} {...a11y}>
      <svg
        className={styles.fallbackSvg}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <radialGradient
            id="curv-fb-fade"
            gradientUnits="userSpaceOnUse"
            cx={CX}
            cy={BASE_Y}
            r={R_MAX * UNIT}
            gradientTransform={`translate(${CX} ${BASE_Y}) scale(1 ${TILT * 1.25}) translate(${-CX} ${-BASE_Y})`}
          >
            <stop offset="0" className={styles.maskOn} />
            <stop offset="0.62" className={styles.maskOn} />
            <stop offset="1" className={styles.maskOff} />
          </radialGradient>
          <mask id="curv-fb-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={VIEW_W} height={VIEW_H}>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#curv-fb-fade)" />
          </mask>
          <radialGradient id="curv-fb-halo">
            <stop offset="0" className={styles.haloIn} />
            <stop offset="0.35" className={styles.haloMid} />
            <stop offset="1" className={styles.haloOut} />
          </radialGradient>
          <radialGradient id="curv-fb-core" cx="0.5" cy="0.5" r="0.5" fx="0.38" fy="0.34">
            <stop offset="0" className={styles.coreHot} />
            <stop offset="0.45" className={styles.coreMid} />
            <stop offset="0.85" className={styles.coreRim} />
            <stop offset="1" className={styles.coreEdge} />
          </radialGradient>
          <radialGradient id="curv-fb-moon" cx="0.5" cy="0.5" r="0.5" fx="0.38" fy="0.34">
            <stop offset="0" className={styles.moonHot} />
            <stop offset="0.55" className={styles.moonMid} />
            <stop offset="1" className={styles.moonRim} />
          </radialGradient>
        </defs>

        <g className={styles.stars}>
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
          ))}
        </g>

        <g mask="url(#curv-fb-mask)">
          <path className={styles.spokes} d={SPOKES} />
          {RINGS.map((ring) => (
            <ellipse
              key={ring.rx}
              className={ring.pink ? styles.ringPink : styles.ringGreen}
              cx={CX}
              cy={ring.cy}
              rx={ring.rx}
              ry={ring.ry}
              opacity={ring.opacity}
            />
          ))}
          <ellipse
            className={styles.orbit}
            cx={CX}
            cy={f1(ORBIT_CY)}
            rx={f1(ORBIT_R * UNIT)}
            ry={f1(ORBIT_R * UNIT * ORBIT_ECC * TILT)}
          />
        </g>

        <circle cx={CX} cy={f1(MASS_CY)} r={MASS_R * 3.6} fill="url(#curv-fb-halo)" />
        <circle className={styles.einstein} cx={CX} cy={f1(MASS_CY)} r={MASS_R * 1.55} />
        <circle cx={CX} cy={f1(MASS_CY)} r={MASS_R} fill="url(#curv-fb-core)" />
        <circle cx={f1(MOON_X)} cy={f1(MOON_Y)} r={17} fill="url(#curv-fb-moon)" />
      </svg>
    </div>
  );
}
