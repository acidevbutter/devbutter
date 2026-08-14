import styles from "./ClosingCta.module.scss";

export default function ClosingCta() {
  return (
    <section className={styles.section}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>
        <h2 className={styles.h2}>
          Vamos entender seu <span className="gn">problema</span> primeiro.
        </h2>
        <p className={styles.subtext}>
          O diagnóstico é o ponto de partida — não uma tecnologia decidida de antemão.
        </p>
        <button className={styles.cta}>Solicitar diagnóstico</button>
      </div>
    </section>
  );
}
