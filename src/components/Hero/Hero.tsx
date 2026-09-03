import ConciergeCta from "@/components/ConciergeCta/ConciergeCta";
import Flask3D from "@/components/Flask3D/Flask3D";
import styles from "./Hero.module.scss";
import HeroFlaskSvg from "./HeroFlaskSvg";
import HeroTerrain from "./HeroTerrain";

const KEYWORD_NODES = [
  { label: "agentes", left: "26%", top: "34%", color: "#79E59B", glow: "#00D26A" },
  { label: "RAG", left: "70%", top: "39%", color: "#F64C6F", glow: "#FF4FA3" },
  { label: "MCP", left: "25%", top: "61%", color: "#79E59B", glow: "#00D26A" },
  { label: "vetores", left: "71%", top: "64%", color: "#F64C6F", glow: "#FF4FA3" },
  { label: "tokens", left: "77%", top: "29%", color: "#79E59B", glow: "#00D26A" },
  { label: "embeddings", left: "22%", top: "42%", color: "#F64C6F", glow: "#FF4FA3" },
];

const MAIN_ROUTES = [
  { d: "M260 250 H150 V96 H110", color: "rgba(121,229,155,.42)", dur: "1.6s" },
  { d: "M260 250 H430 V84", color: "rgba(255,79,163,.42)", dur: "1.9s" },
  { d: "M260 250 H150 V380 H96", color: "rgba(255,79,163,.38)", dur: "2.1s" },
  { d: "M260 250 V392 H440", color: "rgba(121,229,155,.38)", dur: "1.7s" },
];

const BRANCH_STUBS = [
  { d: "M260 250 V172 H150", color: "#79E59B", width: 1.2, dur: "3.2s", delay: "0s" },
  { d: "M260 250 H360 V196", color: "#F64C6F", width: 1.2, dur: "4.1s", delay: ".7s" },
  { d: "M260 250 V306 H150", color: "#79E59B", width: 1.2, dur: "4.6s", delay: "1.3s" },
  { d: "M260 250 V320 H360", color: "#F64C6F", width: 1.1, dur: "3.7s", delay: "2s" },
  { d: "M260 250 H392 V150", color: "#79E59B", width: 1.1, dur: "5.2s", delay: ".3s" },
  { d: "M260 250 H128 V210", color: "#F64C6F", width: 1.1, dur: "4.3s", delay: "2.6s" },
  { d: "M260 250 V214 H322 V150", color: "#79E59B", width: 1, dur: "6s", delay: "1.7s" },
  { d: "M260 250 H196 V344", color: "#F64C6F", width: 1, dur: "5.5s", delay: ".9s" },
];

const JUNCTIONS = [
  { cx: 110, cy: 96, color: "#79E59B" },
  { cx: 430, cy: 84, color: "#F64C6F" },
  { cx: 96, cy: 380, color: "#F64C6F" },
  { cx: 440, cy: 392, color: "#79E59B" },
];

const PADS = [
  { x: 146, y: 168, color: "#79E59B", dur: "3.2s", delay: "0s" },
  { x: 356, y: 192, color: "#F64C6F", dur: "4.1s", delay: ".7s" },
  { x: 146, y: 302, color: "#79E59B", dur: "4.6s", delay: "1.3s" },
  { x: 356, y: 316, color: "#F64C6F", dur: "3.7s", delay: "2s" },
  { x: 388, y: 146, color: "#79E59B", dur: "5.2s", delay: ".3s" },
  { x: 124, y: 206, color: "#F64C6F", dur: "4.3s", delay: "2.6s" },
];

const PULSES = [
  { path: "M110,96 H150 V250 H260", color: "#00D26A", r: 3.6, dur: "3s", delay: "0s" },
  { path: "M430,84 V250 H260", color: "#FF4FA3", r: 3.6, dur: "2.6s", delay: "1s" },
  { path: "M96,380 H150 V250 H260", color: "#FF4FA3", r: 3.6, dur: "3.4s", delay: "1.6s" },
  { path: "M440,392 H260 V250", color: "#00D26A", r: 3.6, dur: "3.1s", delay: "2.2s" },
  { path: "M150,172 H260 V250", color: "#00D26A", r: 2.8, dur: "2.2s", delay: ".4s" },
  { path: "M360,196 V250 H260", color: "#FF4FA3", r: 2.8, dur: "2.4s", delay: "1.4s" },
];

const CHIPS = [
  {
    label: "3D · WebGL",
    variant: "",
    style: { top: "12%", left: 0, animationDuration: "6s", animationDelay: "0s" },
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="#79E59B" strokeWidth={1.5}>
        <path d="M9 2 3 5v8l6 3 6-3V5z" />
        <path d="M3 5l6 3 6-3M9 8v8" />
      </svg>
    ),
  },
  {
    label: "IA · RAG & agentes",
    variant: "pink",
    style: { top: "6%", right: 0, animationDuration: "7s", animationDelay: ".8s" },
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="#F64C6F" strokeWidth={1.5}>
        <path d="M9 2l1.5 5L16 9l-5.5 1.5L9 16l-1.5-5.5L2 9l5.5-1.5z" />
      </svg>
    ),
  },
  {
    label: "Automações · APIs",
    variant: "pink",
    style: { bottom: "16%", left: "-2%", animationDuration: "6.5s", animationDelay: ".4s" },
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="#F64C6F" strokeWidth={1.5}>
        <path d="M2 9h12M10 5l4 4-4 4" />
      </svg>
    ),
  },
  {
    label: "Dados · Contexto",
    variant: "",
    style: { bottom: "10%", right: "-1%", animationDuration: "7.5s", animationDelay: "1.2s" },
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="#79E59B" strokeWidth={1.5}>
        <path d="M9 2 2 6l7 4 7-4z" />
        <path d="M2 10l7 4 7-4" />
      </svg>
    ),
  },
];

export default function Hero() {
  return (
    <section className={styles.hero}>
      <svg
        className={styles.ambientDots}
        width="220"
        height="120"
        viewBox="0 0 220 120"
        aria-hidden="true"
      >
        <g fill="#5a6272">
          <circle cx="6" cy="6" r="1.4" />
          <circle cx="26" cy="6" r="1.4" />
          <circle cx="46" cy="6" r="1.4" />
          <circle cx="6" cy="26" r="1.4" />
          <circle cx="26" cy="26" r="1.4" />
          <circle cx="6" cy="46" r="1.4" />
        </g>
        <path d="M120 20h60l24 24" stroke="#F64C6F" strokeWidth="1.4" fill="none" />
        <circle cx="120" cy="20" r="3" fill="none" stroke="#F64C6F" strokeWidth="1.4" />
        <circle cx="204" cy="44" r="3" fill="#00D26A" />
      </svg>

      <div className={styles.grid}>
        <div>
          <div className={`fu mono ${styles.eyebrow}`}>
            Software · <span className="pk">IA</span> · Automação
          </div>
          <h1 className={`fu ${styles.h1}`}>
            <span className={styles.h1Line1}>Engenharia aplicada a</span>
            <span className={styles.h1Line2}>
              problemas <span className="pk">reais</span>.
            </span>
          </h1>
          <p className={`fu ${styles.paragraph}`}>
            Sites, plataformas, agentes de IA e automações — construídos por quem também projeta
            os sistemas por trás deles. A tecnologia certa depende do problema, não o contrário.
          </p>
          <div className={`fu ${styles.ctas}`}>
            <ConciergeCta className={styles.ctaPrimary}>Solicitar diagnóstico</ConciergeCta>
            <a href="#cases" className={styles.ctaSecondary}>
              Ver cases
            </a>
          </div>
        </div>

        <div className={styles.stage} aria-hidden="true">
          <div className={styles.stageGlow} />

          <svg className={styles.circuitSvg} width="100%" height="100%" viewBox="0 0 520 500">
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {MAIN_ROUTES.map((r, i) => (
                <path
                  key={`route-${i}`}
                  d={r.d}
                  stroke={r.color}
                  strokeWidth={1.6}
                  strokeDasharray="4 6"
                  style={{ animation: `db-dashflow ${r.dur} linear infinite` }}
                />
              ))}
              {BRANCH_STUBS.map((b, i) => (
                <path
                  key={`branch-${i}`}
                  d={b.d}
                  stroke={b.color}
                  strokeWidth={b.width}
                  style={{ animation: `db-surge ${b.dur} ease-in-out infinite ${b.delay}` }}
                />
              ))}
            </g>

            <rect x="253" y="243" width="14" height="14" rx="2" fill="#0b0f18" stroke="#79E59B" strokeWidth={1.6} />
            <rect x="257" y="247" width="6" height="6" rx="1" fill="#00D26A" />

            <g>
              {JUNCTIONS.map((j, i) => (
                <circle key={i} cx={j.cx} cy={j.cy} r="3.5" fill={j.color} />
              ))}
            </g>

            <g strokeWidth={1.2} fill="#0b0f18">
              {PADS.map((p, i) => (
                <rect
                  key={i}
                  x={p.x}
                  y={p.y}
                  width="8"
                  height="8"
                  rx="1"
                  stroke={p.color}
                  style={{ animation: `db-padblink ${p.dur} ease-in-out infinite ${p.delay}` }}
                />
              ))}
            </g>

            {PULSES.map((p, i) => (
              <circle
                key={i}
                r={p.r}
                fill={p.color}
                style={{
                  offsetPath: `path('${p.path}')`,
                  animation: `db-pulse-travel ${p.dur} linear infinite ${p.delay}`,
                  filter: `drop-shadow(0 0 6px ${p.color})`,
                }}
              />
            ))}
          </svg>

          {KEYWORD_NODES.map((k) => (
            <div key={k.label} className={styles.keywordNode} style={{ left: k.left, top: k.top }}>
              <span className={styles.keywordDot} style={{ background: k.color, boxShadow: `0 0 6px ${k.glow}` }} />
              {k.label}
            </div>
          ))}

          <svg className={`${styles.ringSvg} ${styles.ringOuter}`} width="100%" height="100%" viewBox="0 0 520 500">
            <circle cx="260" cy="250" r="150" fill="none" stroke="rgba(121,229,155,.24)" strokeWidth={1} strokeDasharray="2 9" />
          </svg>
          <svg className={`${styles.ringSvg} ${styles.ringInner}`} width="100%" height="100%" viewBox="0 0 520 500">
            <circle cx="260" cy="250" r="116" fill="none" stroke="rgba(255,79,163,.2)" strokeWidth={1} strokeDasharray="1 8" />
          </svg>

          {/* No orbit rings here — the keyword nodes already carry that layer. */}
          {/* The flat flask keeps one size across every breakpoint, so this does too. */}
          <Flask3D
            fallback={<HeroFlaskSvg />}
            placement={{ heightPx: 125, offsetPx: -11 }}
          />

          {CHIPS.map((c) => (
            <div
              key={c.label}
              className={`${styles.chip} ${c.variant === "pink" ? styles.chipPink : ""}`}
              style={c.style}
            >
              {c.icon}
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.terrainSection} aria-hidden="true">
        <div className={styles.terrainGrid} />
        <HeroTerrain />
      </div>
    </section>
  );
}
