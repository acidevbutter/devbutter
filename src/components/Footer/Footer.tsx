import Logomark from "@/components/icons/Logomark";
import styles from "./Footer.module.scss";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.brand}>
        <Logomark width={24} height={28} />
        <span>
          dev<span className="gn">Butter</span> — engenharia aplicada a problemas reais.
        </span>
      </div>
      <span className={`mono ${styles.version}`}>Hi-fi UI · dark editorial · green+pink · v0.3</span>
    </footer>
  );
}
