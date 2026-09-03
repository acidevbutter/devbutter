"use client";

import { useState, type ReactNode } from "react";
import NewQuoteModal from "@/components/portal/NewQuoteModal/NewQuoteModal";

/** Canvas screen 1b: opening bubble the concierge shows before the first turn. */
export const CONCIERGE_GREETING =
  "Oi! Sou a IA da DevButter. Eu entendo o que você precisa, monto um diagnóstico com " +
  "escopo, faixa de investimento e prazo — e o Marcos revisa antes de qualquer contato.\n\n" +
  "Pra começar: o que está te incomodando hoje no seu negócio?";

/** Canvas 1b: the three quick-start chips under the first message. */
export const CONCIERGE_INTENTS = [
  "Quero um site/plataforma",
  "Automatizar atendimento",
  "Ainda não sei",
];

/**
 * A CTA that opens the public "Cotação pela IA" panel (canvas 1b) — the
 * right-anchored, single-column chat panel over the site. Replaces the former
 * `/cotacao` route; every home CTA that used to link there now renders one of
 * these, keeping its own styling via `className`.
 */
export default function ConciergeCta({
  className,
  children,
  ariaLabel,
}: {
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open && (
        <NewQuoteModal
          onClose={() => setOpen(false)}
          mode="public"
          surface="panel"
          initialMessage={CONCIERGE_GREETING}
          openingIntents={CONCIERGE_INTENTS}
        />
      )}
    </>
  );
}
