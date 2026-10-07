"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useConcierge } from "./ConciergeProvider";

export { CONCIERGE_GREETING, CONCIERGE_INTENTS } from "./copy";

const DiagnosisPanel = dynamic(() => import("@/components/DiagnosisPanel/DiagnosisPanel"), {
  ssr: false,
});

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
      {!concierge && localOpen && <DiagnosisPanel onClose={() => setLocalOpen(false)} />}
    </>
  );
}
