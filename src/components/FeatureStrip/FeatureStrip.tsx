import styles from "./FeatureStrip.module.scss";

const FEATURES = [
  {
    accent: "green" as const,
    title: "Sites",
    desc: "Que explicam o que você faz e trazem o contato certo, sem depender de agência pra cada ajuste.",
    icon: (
      <>
        <rect x="3" y="5" width="20" height="16" rx="2.5" />
        <path d="M3 9.5h20M6.5 7.2h.01M9 7.2h.01" />
      </>
    ),
  },
  {
    accent: "pink" as const,
    title: "Plataformas",
    desc: "No lugar das planilhas que ninguém mais confia. Estoque, pedidos e financeiro conversando.",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="8" height="8" rx="2" />
        <rect x="14.5" y="3.5" width="8" height="8" rx="2" />
        <rect x="3.5" y="14.5" width="8" height="8" rx="2" />
        <rect x="14.5" y="14.5" width="8" height="8" rx="2" />
      </>
    ),
  },
  {
    accent: "green" as const,
    title: "Agentes",
    desc: "Que atendem do seu jeito, no WhatsApp ou no site, e passam pra uma pessoa quando precisa.",
    icon: (
      <>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h13A2.5 2.5 0 0 1 22 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-5 4v-4h0.5A2.5 2.5 0 0 1 4 14.5z" />
        <path d="M9 10.5h.01M13 10.5h.01M17 10.5h.01" />
      </>
    ),
  },
  {
    accent: "pink" as const,
    title: "Automações",
    desc: "Pra tarefa repetida que ninguém quer fazer e todo mundo esquece.",
    icon: (
      <>
        <path d="M20.5 10A8 8 0 0 0 6 7.5M5.5 16a8 8 0 0 0 14.5 2.5" />
        <path d="M6 3.5v4h4M20 22.5v-4h-4" />
      </>
    ),
  },
];

/** Home · "O que a gente constrói". */
export default function FeatureStrip() {
  return (
    <section className={styles.section} aria-labelledby="o-que-construimos">
      <h2 id="o-que-construimos" className={styles.eyebrow}>
        O que a gente constrói
      </h2>
      <div className={styles.grid}>
        {FEATURES.map((f) => (
          <div key={f.title} className={`${styles.card} ${styles[f.accent]}`}>
            <div className={styles.iconTile}>
              <svg
                width="26"
                height="26"
                viewBox="0 0 26 26"
                fill="none"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                aria-hidden="true"
              >
                {f.icon}
              </svg>
            </div>
            <h3 className={styles.title}>{f.title}</h3>
            <p className={styles.desc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
