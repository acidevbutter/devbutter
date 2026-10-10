import type { ReactNode } from "react";
import Nav from "@/components/Nav/Nav";
import Footer from "@/components/Footer/Footer";
import { ConciergeProvider } from "@/components/ConciergeCta/ConciergeProvider";
import styles from "./SiteShell.module.scss";

/**
 * Chrome of every public page: sticky nav, footer and the one diagnosis panel
 * all CTAs open. Used by the `(site)` layout and by the root not-found page
 * (which renders outside any route group).
 */
export default function SiteShell({ children }: { children: ReactNode }) {
  return (
    <ConciergeProvider>
      <a href="#conteudo" className={styles.skip}>
        Pular para o conteúdo
      </a>
      <Nav />
      <main id="conteudo" className={styles.main} tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </ConciergeProvider>
  );
}
