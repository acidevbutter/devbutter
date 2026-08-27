"use client";

import { useEffect } from "react";
import Link from "next/link";
import SessionCard from "@/components/portal/SessionCard/SessionCard";
import styles from "@/components/portal/SessionCard/SessionCard.module.scss";

const AUTH_HINTS = ["unauthenticated", "unauthorized", "401", "sessão", "session"];

export default function PortalDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[portal] dashboard error boundary:", error);
  }, [error]);

  const looksLikeAuth = AUTH_HINTS.some((hint) =>
    error.message?.toLowerCase().includes(hint)
  );

  if (looksLikeAuth) {
    return (
      <SessionCard
        title="Sua sessão expirou"
        body="Não foi possível confirmar seu acesso. Entre novamente para continuar."
        ctaLabel="Entrar novamente"
        ctaHref="/portal/login"
      />
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.title}>Algo deu errado ao carregar</h1>
        <p className={styles.body}>
          Tivemos um problema para montar esta página. Você pode tentar de novo — se continuar,
          fale com a gente.
        </p>
        <button
          type="button"
          className={styles.cta}
          style={{ border: "none", cursor: "pointer", width: "100%" }}
          onClick={() => reset()}
        >
          Tentar novamente
        </button>
        <Link href="/portal" className={styles.ctaGhost}>
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}
