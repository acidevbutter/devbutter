"use client";

import useRevealOnce from "@/hooks/useRevealOnce";
import styles from "./Projects.module.scss";

const PROJECTS = [
  {
    accent: "green" as const,
    title: "Crate Diggr",
    desc: "Assistente multi-agente de descoberta musical, com Spotify MCP.",
    tags: [{ label: "Multi-agente", accent: true }, { label: "Spotify MCP", accent: false }],
    icon: (
      <svg width="20" height="20">
        <circle cx="5" cy="5" r="2.4" fill="#79E59B" />
        <circle cx="15" cy="6" r="2.4" fill="#F64C6F" />
        <circle cx="10" cy="15" r="2.4" fill="#79E59B" />
        <line x1="5" y1="5" x2="15" y2="6" stroke="#5a6272" />
        <line x1="5" y1="5" x2="10" y2="15" stroke="#5a6272" />
      </svg>
    ),
  },
  {
    accent: "pink" as const,
    title: "Orbit AI",
    desc: "Agente MCP de produtividade pessoal — conecta Calendar, Gmail, Notion e GitHub.",
    tags: [{ label: "MCP", accent: true }, { label: "Integrações", accent: false }],
    icon: (
      <svg width="20" height="20">
        <rect x="3" y="3" width="14" height="14" rx="2" fill="none" stroke="#F64C6F" />
        <line x1="3" y1="8" x2="17" y2="8" stroke="#F64C6F" />
        <circle cx="6" cy="5.5" r="1" fill="#79E59B" />
      </svg>
    ),
  },
  {
    accent: "green" as const,
    title: "GranAI",
    desc: "Copiloto financeiro com IA — fluxos multi-agente e análise conversacional.",
    tags: [{ label: "Fintech", accent: true }, { label: "Multi-agente", accent: false }],
    icon: (
      <svg width="20" height="20">
        <polyline points="3,15 7,10 11,12 17,4" fill="none" stroke="#79E59B" strokeWidth={1.6} />
      </svg>
    ),
  },
  {
    accent: "pink" as const,
    title: "PlantOS",
    desc: "Sistemas multi-agente e integração AI/IoT para dados e engenharia.",
    tags: [{ label: "IoT", accent: true }, { label: "Dados", accent: false }],
    icon: (
      <svg width="20" height="20">
        <path
          d="M10 17V9M10 9C6 9 5 5 5 3c3 0 6 2 6 6M10 9c0-4 3-6 6-6 0 2-1 6-5 6"
          fill="none"
          stroke="#F64C6F"
        />
      </svg>
    ),
  },
  {
    accent: "green" as const,
    title: "Spotme",
    desc: "Estatísticas do Spotify transformadas em identidade visual compartilhável.",
    tags: [{ label: "Produto", accent: true }, { label: "Visual", accent: false }],
    icon: (
      <svg width="20" height="20">
        <path d="M4 14v-2M8 14V6M12 14V9M16 14v-5" stroke="#79E59B" strokeWidth={1.8} strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Projects() {
  const [rowRef, shown] = useRevealOnce<HTMLDivElement>();

  return (
    <section id="cases" className={styles.section}>
      <div className={`mono gn ${styles.eyebrow}`}>Selected work</div>
      <div className={styles.headRow}>
        <h2 className={styles.h2}>
          Projetos em <span className="gn">destaque</span>
        </h2>
        <span className={`mono ${styles.dragHint}`}>← arraste →</span>
      </div>
      <p className={styles.intro}>
        Uma amostra do que construímos — do produto interno ao experimento de pesquisa.
      </p>

      <div ref={rowRef} className={styles.scroller}>
        {PROJECTS.map((p, i) => (
          <a
            key={p.title}
            href="#"
            className={`${styles.card} ${shown ? styles.cardIn : ""} ${
              p.accent === "green" ? styles.cardGreen : styles.cardPink
            }`}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div className={`${styles.iconTile} ${p.accent === "green" ? styles.iconTileGreen : styles.iconTilePink}`}>
              {p.icon}
            </div>
            <h3 className={styles.cardTitle}>{p.title}</h3>
            <p className={styles.cardDesc}>{p.desc}</p>
            <div className={styles.tags}>
              {p.tags.map((t) => (
                <span
                  key={t.label}
                  className={`mono ${styles.tag} ${t.accent ? (p.accent === "green" ? styles.tagGreen : styles.tagPink) : ""}`}
                >
                  {t.label}
                </span>
              ))}
            </div>
            <div className={styles.cardLink}>Ver projeto →</div>
          </a>
        ))}

        <a href="#" className={styles.moreCard}>
          <div className={styles.moreCircle}>→</div>
          <div className={styles.moreLabel}>Ver todos os cases</div>
          <div className={`mono ${styles.moreSub}`}>+ experimentos</div>
        </a>
      </div>
    </section>
  );
}
