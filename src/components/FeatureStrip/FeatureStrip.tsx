import styles from "./FeatureStrip.module.scss";

const FEATURES = [
  {
    accent: "green" as const,
    title: "Experiências 3D imersivas",
    desc: "WebGL e Three.js que dão presença à marca.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#79E59B" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        <path d="M13 3 4 8v10l9 5 9-5V8z" />
        <path d="M4 8l9 5 9-5M13 13v10" />
      </svg>
    ),
  },
  {
    accent: "pink" as const,
    title: "IA aplicada a problemas reais",
    desc: "Agentes e RAG treinados no seu contexto.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#F64C6F" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        <path d="M10 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3V4z" />
        <path d="M16 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3V4z" />
        <path d="M10 10h2M14 15h2" />
      </svg>
    ),
  },
  {
    accent: "green" as const,
    title: "Automação que escala",
    desc: "Fluxos que conectam suas ferramentas.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#79E59B" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        <circle cx="7" cy="7" r="3" />
        <circle cx="19" cy="19" r="3" />
        <path d="M10 7h6a3 3 0 0 1 3 3v6M16 4l3 3-3 3" />
      </svg>
    ),
  },
  {
    accent: "pink" as const,
    title: "Decisões guiadas por dados",
    desc: "Do dado bruto à decisão com contexto.",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#F64C6F" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        <path d="M4 4v18h18" />
        <path d="M8 16l4-5 3 3 5-7" />
        <circle cx="20" cy="7" r="1.3" fill="#F64C6F" />
      </svg>
    ),
  },
];

export default function FeatureStrip() {
  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`${styles.card} ${f.accent === "green" ? styles.cardGreen : styles.cardPink}`}
          >
            <div className={`${styles.iconTile} ${f.accent === "green" ? styles.iconTileGreen : styles.iconTilePink}`}>
              {f.icon}
            </div>
            <div className={styles.title}>{f.title}</div>
            <p className={styles.desc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
