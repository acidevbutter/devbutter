import type { ReactNode } from "react";
import Link from "next/link";
import Logomark from "@/components/icons/Logomark";
import styles from "./AuthShell.module.scss";

/**
 * Account screens (`#/entrar`, `#/criar-conta`, … in the prototype): no site
 * nav/footer, a slim header with the "minha conta" pill and one centered card.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="DevButter — voltar ao site">
          <Logomark width={22} height={25} />
          <span className={styles.wordmark}>
            Dev<span className={styles.accent}>Butter</span>
          </span>
          <span className={styles.pill}>minha conta</span>
        </Link>
        <Link href="/" className={styles.back}>
          ← voltar ao site
        </Link>
      </header>
      <main className={styles.stage}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.card}>{children}</div>
      </main>
    </div>
  );
}
