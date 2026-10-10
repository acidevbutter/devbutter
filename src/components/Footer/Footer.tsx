import Link from "next/link";
import Logomark from "@/components/icons/Logomark";
import styles from "./Footer.module.scss";

const FOOTER_LINKS = [
  { label: "Cases", href: "/cases" },
  { label: "Como trabalhamos", href: "/metodo" },
  { label: "Contato", href: "/contato" },
  { label: "Minha conta", href: "/entrar" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Logomark width={18} height={20} />
          <span>DevButter · engenharia aplicada a problemas reais</span>
        </div>
        <nav className={styles.links} aria-label="Rodapé">
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={styles.link}>
              {l.label}
            </Link>
          ))}
        </nav>
        <span className={styles.copy}>© 2026 · São Paulo</span>
      </div>
    </footer>
  );
}
