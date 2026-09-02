import Link from "next/link";
import { listAllQuotesForTable } from "@/lib/admin/services/quotes";
import { resolveClientLabel } from "@/lib/admin/services/clients";
import { formatDate, quoteStatusTone } from "@/lib/admin/format";
import Badge from "@/components/admin/ui/Badge/Badge";
import Button from "@/components/admin/ui/Button/Button";
import type { QuoteStatus } from "@/lib/admin/types";
import styles from "@/styles/AdminList.module.scss";

const STATUS_FILTERS: { key: QuoteStatus; label: string }[] = [
  { key: "draft", label: "draft" },
  { key: "approved", label: "approved" },
  { key: "edited", label: "edited" },
  { key: "rejected", label: "rejected" },
];

const COLUMNS = ".5fr 1.1fr 1.8fr .8fr .6fr .6fr .8fr .6fr";
const PAGE_SIZE = 20;

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; origin?: string; q?: string; p?: string }>;
}) {
  const { status, origin, q, p } = await searchParams;
  const quotes = await listAllQuotesForTable();
  const clientLabels = await Promise.all(
    quotes.map((quote) => resolveClientLabel(quote.account_id))
  );

  const counts = quotes.reduce<Record<string, number>>((acc, quote) => {
    acc[quote.status] = (acc[quote.status] ?? 0) + 1;
    return acc;
  }, {});

  const filteredPairs = quotes
    .map((quote, i) => ({ quote, label: clientLabels[i] }))
    .filter(({ quote, label }) => {
      if (status && quote.status !== status) return false;
      if (origin && quote.source !== origin) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (
          !label.toLowerCase().includes(needle) &&
          !quote.scope_summary.toLowerCase().includes(needle)
        ) {
          return false;
        }
      }
      return true;
    });

  const totalPages = Math.max(1, Math.ceil(filteredPairs.length / PAGE_SIZE));
  const page = Math.min(Math.max(Number(p) || 1, 1), totalPages);
  const pagePairs = filteredPairs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function filterHref(next: { status?: string; origin?: string; p?: number }) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const nextStatus = "status" in next ? next.status : status;
    const nextOrigin = "origin" in next ? next.origin : origin;
    if (nextStatus) params.set("status", nextStatus);
    if (nextOrigin) params.set("origin", nextOrigin);
    if (next.p && next.p > 1) params.set("p", String(next.p));
    const qs = params.toString();
    return qs ? `/admin/quotes?${qs}` : "/admin/quotes";
  }

  return (
    <div className={styles.page}>
      <div className={styles.countBar}>
        <span>quotes</span>
        <span className={styles.countBarValue}>{quotes.length} registros</span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Quotes</h1>
        <div className={styles.headerActions}>
          <form>
            <input
              className={styles.search}
              name="q"
              defaultValue={q}
              placeholder="buscar cliente…"
            />
          </form>
          <Button href="/admin/quotes/new" size="sm">
            + Novo quote manual
          </Button>
        </div>
      </div>

      <div className={styles.chips}>
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={filterHref({ status: status === f.key ? undefined : f.key })}
            className={`${styles.chip} ${status === f.key ? styles.chipActive : ""}`}
          >
            {f.label} {counts[f.key] ?? 0}
          </Link>
        ))}
        <span className={styles.chipSep} />
        <Link
          href={filterHref({ origin: origin === "ai" ? undefined : "ai" })}
          className={`${styles.chip} ${origin === "ai" ? styles.chipActive : ""}`}
        >
          origem: IA
        </Link>
        <Link
          href={filterHref({ origin: origin === "manual" ? undefined : "manual" })}
          className={`${styles.chip} ${origin === "manual" ? styles.chipActive : ""}`}
        >
          manual
        </Link>
      </div>

      <div className={styles.panel}>
        <div className={styles.headerRow} style={{ ["--cols" as string]: COLUMNS }}>
          <span>id</span>
          <span>cliente</span>
          <span>escopo</span>
          <span>faixa</span>
          <span>prazo</span>
          <span>origem</span>
          <span>status</span>
          <span>data</span>
        </div>
        {pagePairs.length === 0 && <div className={styles.empty}>Nenhum quote encontrado.</div>}
        {pagePairs.map(({ quote, label }) => (
          <Link
            key={quote.id}
            href={`/admin/quotes/${quote.id}`}
            className={`${styles.row} ${quote.status === "draft" ? styles.rowHighlight : ""}`}
            style={{ ["--cols" as string]: COLUMNS }}
          >
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                color: "var(--admin-text-2)",
              }}
            >
              {quote.reference || quote.id.slice(0, 8)}
            </span>
            <span style={{ fontWeight: 600 }}>{label}</span>
            <span style={{ color: "var(--admin-text-2)" }}>{quote.scope_summary}</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
              {quote.price_range ?? "—"}
            </span>
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                color: "var(--admin-text-2)",
              }}
            >
              {quote.timeline ?? "—"}
            </span>
            <span
              style={{
                font: "500 10px 'Geist Mono', monospace",
                color: quote.source === "ai" ? "var(--db-green)" : "var(--admin-text-2)",
              }}
            >
              {quote.source === "ai" ? "IA" : "manual"}
            </span>
            <Badge tone={quoteStatusTone(quote.status)} style={{ justifySelf: "start" }}>
              {quote.status}
            </Badge>
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                color: "var(--db-text-muted)",
              }}
            >
              {formatDate(quote.created_at)}
            </span>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {page > 1 ? (
            <Link href={filterHref({ p: page - 1 })}>‹</Link>
          ) : (
            <span data-nav aria-disabled="true">‹</span>
          )}
          <span>
            página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={filterHref({ p: page + 1 })}>›</Link>
          ) : (
            <span data-nav aria-disabled="true">›</span>
          )}
        </div>
      )}
    </div>
  );
}
