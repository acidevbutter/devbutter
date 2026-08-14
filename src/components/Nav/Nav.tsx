import Logomark from "@/components/icons/Logomark";
import styles from "./Nav.module.scss";

const LINKS = ["Soluções", "Cases", "Sobre", "Insights"];

export default function Nav() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <Logomark />
        <span className={styles.wordmark}>
          Dev<span className="gn">Butter</span>
        </span>
      </div>

      <nav className={styles.nav} aria-label="Navegação principal">
        {LINKS.map((label) => (
          <a key={label} href="#">
            {label}
          </a>
        ))}
      </nav>

      <div className={styles.actions}>
        <button className={styles.ghostBtn}>Falar com a IA</button>
        <button className={styles.solidBtn}>Solicitar diagnóstico</button>
      </div>
    </header>
  );
}
