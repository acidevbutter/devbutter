import Logomark from "@/components/icons/Logomark";
import NotifyForm from "./NotifyForm";
import StatusLog from "./StatusLog";
import styles from "./Maintenance.module.scss";

const TAGS = [
  { label: "Sites e plataformas", variant: "green" },
  { label: "Agentes de IA", variant: "pink" },
  { label: "Automações e integrações", variant: "" },
  { label: "Sistemas internos e dashboards", variant: "" },
];

const ROUTES = [
  { d: "M260 250 H150 V104 H104", color: "rgba(121,229,155,.4)", dur: "1.6s" },
  { d: "M260 250 H424 V92", color: "rgba(255,79,163,.4)", dur: "1.9s" },
  { d: "M260 250 H140 V372 H100", color: "rgba(255,79,163,.34)", dur: "2.1s" },
  { d: "M260 250 V380 H436", color: "rgba(121,229,155,.34)", dur: "1.7s" },
];

const JUNCTIONS = [
  { cx: 104, cy: 104, color: "#79E59B" },
  { cx: 424, cy: 92, color: "#F64C6F" },
  { cx: 100, cy: 372, color: "#F64C6F" },
  { cx: 436, cy: 380, color: "#79E59B" },
];

const PADS = [
  { x: 146, y: 170, color: "#79E59B", dur: "3.2s", delay: "0s" },
  { x: 356, y: 196, color: "#F64C6F", dur: "4.1s", delay: ".7s" },
  { x: 146, y: 304, color: "#79E59B", dur: "4.6s", delay: "1.3s" },
  { x: 356, y: 318, color: "#F64C6F", dur: "3.7s", delay: "2s" },
];

const PULSES = [
  { path: "M104,104 H150 V250 H260", color: "#00D26A", dur: "3s", delay: "0s" },
  { path: "M424,92 V250 H260", color: "#FF4FA3", dur: "2.6s", delay: "1s" },
  { path: "M100,372 H140 V250 H260", color: "#FF4FA3", dur: "3.4s", delay: "1.6s" },
  { path: "M436,380 H260 V250", color: "#00D26A", dur: "3.1s", delay: "2.2s" },
];

const FLASK_PATH =
  "M84 30h32v46l40 96a18 18 0 0 1-16.7 24.7H60.7A18 18 0 0 1 44 172l40-96V30z";

export default function Maintenance() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Logomark />
          <span className={styles.brandName}>
            Dev<span className="gn">Butter</span>
          </span>
        </div>
        <span className={`mono ${styles.statusPill}`}>
          <span className={styles.statusDot} />
          site em reconstrução
        </span>
      </header>

      <main className={styles.main}>
        <div>
          <div className={`fu mono ${styles.eyebrow}`}>
            Estúdio de tecnologia · <span className="pk">engenharia aplicada a problemas reais</span>
          </div>

          <h1 className={`fu ${styles.h1}`}>
            <span className={styles.h1Line1}>Nosso site está sendo</span>
            <span className={styles.h1Line2}>
              recons<span className="pk">truído</span>.
            </span>
          </h1>

          <p className={`fu ${styles.paragraph}`}>
            A DevButter é um estúdio de tecnologia que transforma processos e problemas de operação
            em software: sites, plataformas, agentes de IA, automações e sistemas sob medida.
            Estamos refazendo esta página inteira para explicar isso com a clareza que o trabalho
            exige.
          </p>
          <p className={`fu ${styles.paragraph} ${styles.paragraphSecond}`}>
            <span className={styles.strong}>
              Os projetos seguem em andamento e o atendimento continua normal.
            </span>{" "}
            Se você tem um problema operacional para resolver, o ponto de partida é um diagnóstico —
            não uma tecnologia decidida de antemão.
          </p>

          <div className={`fu ${styles.tags}`}>
            {TAGS.map((tag) => (
              <span
                key={tag.label}
                className={`mono ${styles.tag} ${
                  tag.variant === "green"
                    ? styles.tagGreen
                    : tag.variant === "pink"
                      ? styles.tagPink
                      : ""
                }`}
              >
                {tag.label}
              </span>
            ))}
          </div>

          <NotifyForm />

          <div className={`fu ${styles.contact}`}>
            <div>
              <div className={`mono ${styles.contactLabel}`}>solicitar diagnóstico</div>
              <a className={styles.contactLink} href="mailto:contato@devbutter.com">
                contato@devbutter.com
              </a>
            </div>
            <div className={styles.contactDivider} />
            <div>
              <div className={`mono ${styles.contactLabel}`}>conversa direta</div>
              <a className={`${styles.contactLink} ${styles.contactLinkPink}`} href="#">
                WhatsApp
              </a>
            </div>
            <div className={styles.contactDivider} />
            <div>
              <div className={`mono ${styles.contactLabel}`}>onde mais nos encontrar</div>
              <a className={styles.contactLink} href="#">
                GitHub · LinkedIn
              </a>
            </div>
          </div>
        </div>

        <div className={styles.stage}>
          <div className={styles.stageGlow} aria-hidden="true" />

          <svg
            className={styles.circuitSvg}
            width="100%"
            height="100%"
            viewBox="0 0 520 540"
            aria-hidden="true"
          >
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {ROUTES.map((r) => (
                <path
                  key={r.d}
                  d={r.d}
                  stroke={r.color}
                  strokeWidth={1.6}
                  strokeDasharray="4 6"
                  style={{ animation: `db-dashflow ${r.dur} linear infinite` }}
                />
              ))}
            </g>

            <rect x="253" y="243" width="14" height="14" rx="2" fill="#0b0f18" stroke="#79E59B" strokeWidth={1.6} />
            <rect x="257" y="247" width="6" height="6" rx="1" fill="#00D26A" />

            <g>
              {JUNCTIONS.map((j) => (
                <circle key={`${j.cx}-${j.cy}`} cx={j.cx} cy={j.cy} r="3.5" fill={j.color} />
              ))}
            </g>

            <g strokeWidth={1.2} fill="#0b0f18">
              {PADS.map((p) => (
                <rect
                  key={`${p.x}-${p.y}`}
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

            {PULSES.map((p) => (
              <circle
                key={p.path}
                r="3.6"
                fill={p.color}
                style={{
                  offsetPath: `path('${p.path}')`,
                  animation: `db-pulse-travel ${p.dur} linear infinite ${p.delay}`,
                  filter: `drop-shadow(0 0 6px ${p.color})`,
                }}
              />
            ))}
          </svg>

          <svg
            className={`${styles.ringSvg} ${styles.ringOuter}`}
            width="100%"
            height="100%"
            viewBox="0 0 520 540"
            aria-hidden="true"
          >
            <circle cx="260" cy="250" r="152" fill="none" stroke="rgba(121,229,155,.24)" strokeWidth={1} strokeDasharray="2 9" />
          </svg>
          <svg
            className={`${styles.ringSvg} ${styles.ringInner}`}
            width="100%"
            height="100%"
            viewBox="0 0 520 540"
            aria-hidden="true"
          >
            <circle cx="260" cy="250" r="118" fill="none" stroke="rgba(255,79,163,.2)" strokeWidth={1} strokeDasharray="1 8" />
          </svg>

          <svg className={styles.flaskSvg} viewBox="0 0 200 240" aria-hidden="true">
            <defs>
              <clipPath id="maintenance-flask-clip">
                <path d={FLASK_PATH} />
              </clipPath>
            </defs>
            <path d={FLASK_PATH} fill="rgba(245,247,251,.05)" stroke="#f5f7fb" strokeWidth={2.4} />
            <rect
              x="34"
              y="134"
              width="132"
              height="78"
              fill="#79E59B"
              clipPath="url(#maintenance-flask-clip)"
              className={styles.flaskLiquidTop}
            />
            <rect
              x="34"
              y="162"
              width="132"
              height="50"
              fill="#F64C6F"
              clipPath="url(#maintenance-flask-clip)"
              className={styles.flaskLiquidBottom}
            />
            <path
              d="M92 52l-1.6 2 1.6 2M108 52l1.6 2-1.6 2"
              stroke="#00D26A"
              strokeWidth={1.7}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="80" y="24" width="40" height="8" rx="2" fill="#0b0f18" stroke="#f5f7fb" strokeWidth={2} />
            <g>
              <circle cx="98" cy="20" r="2.6" fill="#79E59B" className={styles.bubble} />
              <circle cx="106" cy="18" r="2" fill="#F64C6F" className={styles.bubble} style={{ animationDuration: "2.8s", animationDelay: ".6s" }} />
              <circle cx="92" cy="16" r="1.6" fill="#79E59B" className={styles.bubble} style={{ animationDuration: "2.2s", animationDelay: "1.1s" }} />
            </g>
            <g>
              <ellipse cx="128" cy="96" rx="2.2" ry="3.4" fill="#79E59B" className={styles.drip} />
              <ellipse cx="74" cy="112" rx="1.8" ry="3" fill="#F64C6F" className={styles.drip} style={{ animationDuration: "4.2s", animationDelay: "1.3s" }} />
            </g>
          </svg>

          <div className={styles.logCard}>
            <div className={styles.logHeader}>
              <span className={`mono ${styles.logTitle}`}>
                ❯ <span className="gn">devbutter</span> · status do projeto
              </span>
              <span className={`mono ${styles.logBadge}`}>
                <span className={styles.logBadgeDot} />
                em andamento
              </span>
            </div>
            <StatusLog />
          </div>
        </div>
      </main>

      <div className={styles.terrain} aria-hidden="true" />

      <footer className={styles.footer}>
        <span>
          dev<span className="gn">Butter</span> — engenharia aplicada a problemas reais.
        </span>
        <span className={`mono ${styles.footerNote}`}>
          site em reconstrução · atendimento normal
        </span>
      </footer>
    </div>
  );
}
