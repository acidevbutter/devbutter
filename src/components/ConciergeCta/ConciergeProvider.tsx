"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import styles from "./Toast.module.scss";

// The panel (and socket.io-client with it) is only downloaded the first time a
// visitor opens the chat — the home pays nothing for it up front.
const DiagnosisPanel = dynamic(() => import("@/components/DiagnosisPanel/DiagnosisPanel"), {
  ssr: false,
});

type Toast = { title: string; meta: string };

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
  const [toast, setToast] = useState<Toast | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openChat = useCallback(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setOpen(false);
    // Back to the CTA that opened the panel (dialog focus contract).
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const value = useMemo(() => ({ open, openChat, closeChat }), [open, openChat, closeChat]);

  return (
    <ConciergeContext.Provider value={value}>
      {children}
      {open && <DiagnosisPanel onClose={closeChat} onNotify={(title, meta) => setToast({ title, meta })} />}
      <div className={styles.region} role="status" aria-live="polite">
        {toast && (
          <div className={styles.toast}>
            <span className={styles.check} aria-hidden="true">
              ✓
            </span>
            <div>
              <div className={styles.title}>{toast.title}</div>
              <div className={styles.meta}>{toast.meta}</div>
            </div>
          </div>
        )}
      </div>
    </ConciergeContext.Provider>
  );
}

/** `null` outside the site layout (e.g. a CTA rendered on its own). */
export function useConcierge(): ConciergeContextValue | null {
  return useContext(ConciergeContext);
}
