import type { Metadata } from "next";
import { Suspense } from "react";
import CasesExplorer, { CasesExplorerStatic } from "./CasesExplorer";
import styles from "./Cases.module.scss";

export const metadata: Metadata = {
  title: "Cases",
  description:
    "Problemas que deixaram de doer: varejo, saúde, logística, educação e serviços. Cada case começa pelo que incomodava — a tecnologia vem depois.",
  alternates: { canonical: "/cases" },
  openGraph: { title: "Cases · DevButter", url: "/cases" },
};

export default function CasesPage() {
  return (
    <section className={styles.section}>
      <div className={styles.eyebrow}>Cases</div>
      <h1 className={styles.title}>Problemas que deixaram de doer.</h1>
      <p className={styles.lead}>
        Nomes de empresas trocados a pedido dos clientes. O problema e o resultado são reais.
      </p>
      {/* useSearchParams precisa de Suspense no prerender; o fallback é a lista completa. */}
      <Suspense fallback={<CasesExplorerStatic />}>
        <CasesExplorer />
      </Suspense>
    </section>
  );
}
