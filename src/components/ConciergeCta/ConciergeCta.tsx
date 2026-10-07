"use client";

import { useState, type ReactNode } from "react";
import NewQuoteModal from "@/components/portal/NewQuoteModal/NewQuoteModal";
import { useConcierge } from "./ConciergeProvider";
import { CONCIERGE_GREETING, CONCIERGE_INTENTS } from "./copy";

export { CONCIERGE_GREETING, CONCIERGE_INTENTS };

/**
 * A CTA that opens the public diagnosis panel. Inside the site layout it opens
 * the shared panel from `ConciergeProvider`; anywhere else it falls back to a
 * panel of its own, so the component keeps working outside the site shell.
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
  const concierge = useConcierge();
  const [localOpen, setLocalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={() => (concierge ? concierge.openChat() : setLocalOpen(true))}
      >
        {children}
      </button>
      {!concierge && localOpen && (
        <NewQuoteModal
          onClose={() => setLocalOpen(false)}
          mode="public"
          surface="panel"
          initialMessage={CONCIERGE_GREETING}
          openingIntents={CONCIERGE_INTENTS}
        />
      )}
    </>
  );
}
