"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import NewQuoteModal from "@/components/portal/NewQuoteModal/NewQuoteModal";
import { CONCIERGE_GREETING, CONCIERGE_INTENTS } from "./copy";

type ConciergeContextValue = {
  /** True while the diagnosis panel is on screen — scenes pause on it. */
  open: boolean;
  openChat: () => void;
  closeChat: () => void;
};

const ConciergeContext = createContext<ConciergeContextValue | null>(null);

/**
 * One diagnosis panel for the whole public site. Every "Solicitar diagnóstico"
 * / "Começar a conversa" CTA opens this same instance (the prototype's single
 * `openChat`), so a conversation in progress survives moving between CTAs and
 * the 3D scenes can pause while it's open.
 */
export function ConciergeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, openChat, closeChat }), [open, openChat, closeChat]);

  return (
    <ConciergeContext.Provider value={value}>
      {children}
      {open && (
        <NewQuoteModal
          onClose={closeChat}
          mode="public"
          surface="panel"
          initialMessage={CONCIERGE_GREETING}
          openingIntents={CONCIERGE_INTENTS}
        />
      )}
    </ConciergeContext.Provider>
  );
}

/** `null` outside the site layout (e.g. a CTA rendered on its own). */
export function useConcierge(): ConciergeContextValue | null {
  return useContext(ConciergeContext);
}
