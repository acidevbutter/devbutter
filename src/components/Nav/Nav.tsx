"use client";

import { useState } from "react";
import Link from "next/link";
import Logomark from "@/components/icons/Logomark";
import NewQuoteModal from "@/components/portal/NewQuoteModal/NewQuoteModal";
import {
  CONCIERGE_GREETING,
  CONCIERGE_INTENTS,
} from "@/components/ConciergeCta/ConciergeCta";
import styles from "./Nav.module.scss";

const LINKS = [
  { label: "Soluções", href: "#solucoes" },
  { label: "Cases", href: "#cases" },
  { label: "Sobre", href: "#sobre" },
  { label: "Insights", href: "#insights" },
];

export default function Nav() {
  // Both "Falar com a IA" and "Solicitar diagnóstico" open the same right-anchored
  // concierge panel (canvas 1b) -- there is no dedicated /cotacao route anymore.
  const [showChat, setShowChat] = useState(false);

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="DevButter — voltar para a home">
        <Logomark />
        <span className={styles.wordmark}>
          Dev<span className="gn">Butter</span>
        </span>
      </Link>

      <nav className={styles.nav} aria-label="Navegação principal">
        {LINKS.map(({ label, href }) => (
          <a key={label} href={href}>
            {label}
          </a>
        ))}
      </nav>

      <div className={styles.actions}>
        <Link href="/portal/login" className={styles.loginBtn}>
          Entrar
        </Link>
        <button type="button" className={styles.ghostBtn} onClick={() => setShowChat(true)}>
          Falar com a IA
        </button>
        <button type="button" className={styles.solidBtn} onClick={() => setShowChat(true)}>
          Solicitar diagnóstico
        </button>
      </div>

      {showChat && (
        <NewQuoteModal
          onClose={() => setShowChat(false)}
          mode="public"
          surface="panel"
          initialMessage={CONCIERGE_GREETING}
          openingIntents={CONCIERGE_INTENTS}
        />
      )}
    </header>
  );
}
