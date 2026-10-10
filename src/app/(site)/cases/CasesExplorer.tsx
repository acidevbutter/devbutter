"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CaseCard from "@/components/CaseCard/CaseCard";
import ConciergeCta from "@/components/ConciergeCta/ConciergeCta";
import { CASES, SECTORS, filterCases, parseSectorFilter, type SectorFilter } from "@/content/cases";
import styles from "./Cases.module.scss";

const FILTERS: { value: SectorFilter; label: string }[] = [
  { value: "todos", label: "todos" },
  ...SECTORS.map((s) => ({ value: s.slug, label: s.label })),
];

function hrefFor(filter: SectorFilter) {
  return filter === "todos" ? "/cases" : `/cases?setor=${filter}`;
}

function ExplorerView({ filter }: { filter: SectorFilter }) {
  const list = filterCases(filter, CASES);
  const current = FILTERS.find((f) => f.value === filter)?.label ?? "todos";

  return (
    <>
      <nav className={styles.filters} aria-label="Filtrar cases por setor">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={hrefFor(f.value)}
            replace
            scroll={false}
            className={styles.filter}
            aria-current={f.value === filter ? "true" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <p className="sr-only" role="status">
        {list.length === 1 ? "1 case" : `${list.length} cases`} em {current}
      </p>
      <div className={styles.grid}>
        {list.map((c) => (
          // key com o filtro: a entrada (rise) roda de novo a cada troca, como no protótipo
          <CaseCard key={`${filter}-${c.id}`} item={c} variant="grid" />
        ))}
        <ConciergeCta className={styles.yours}>
          <span className={styles.yoursIcon} aria-hidden="true">
            +
          </span>
          <span className={styles.yoursTitle}>Seu problema aqui?</span>
          <span className={styles.yoursSub}>conta pra gente</span>
        </ConciergeCta>
      </div>
    </>
  );
}

/** Filtro por setor (`?setor=`) — a URL é o estado; sem JS os links ainda filtram. */
export default function CasesExplorer() {
  const params = useSearchParams();
  return <ExplorerView filter={parseSectorFilter(params.get("setor"))} />;
}

/** Fallback do Suspense (prerender): lista completa, filtros como links simples. */
export function CasesExplorerStatic() {
  return <ExplorerView filter="todos" />;
}
