import Link from "next/link";
import Badge from "@/components/admin/ui/Badge/Badge";
import NewQuoteButton from "@/components/portal/NewQuoteModal/NewQuoteButton";
import { listQuotes } from "@/lib/portal/services/quotes";
import { formatDate, quoteStatusTone } from "@/lib/admin/format";
import styles from "./Quotes.module.scss";

const STATUS_LABEL: Record<string, string> = {
  draft: "Em análise pela DevButter",
  approved: "Aprovado",
  edited: "Aprovado",
  rejected: "Não aprovado",
};

export default async function PortalQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const [quotes, { new: autoOpenParam }] = await Promise.all([listQuotes(), searchParams]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Meus orçamentos</h1>
          <div className={styles.subtitle}>tudo que você já pediu pra gente</div>
        </div>
        <NewQuoteButton label="Solicitar novo" autoOpen={autoOpenParam === "1"} />
      </div>

      <div className={styles.list}>
        {quotes.map((q) => (
          <div
            key={q.id}
            className={`${styles.card} ${q.status === "draft" ? styles.cardPending : ""} ${
              q.status === "rejected" ? styles.cardRejected : ""
            }`}
          >
            <div className={styles.cardTop}>
              <Badge tone={quoteStatusTone(q.status)}>{STATUS_LABEL[q.status]}</Badge>
              <span className={styles.date}>{formatDate(q.createdAt)}</span>
            </div>
            <div className={styles.cardTitle}>{q.title}</div>
            {q.description && <p className={styles.cardDesc}>{q.description}</p>}
            <div className={styles.cardBottom}>
              <span className={styles.mono}>
                {q.priceRange ?? "—"}
                {q.timeline ? ` · ${q.timeline}` : ""}
              </span>
              {q.projectId ? (
                <Link href={`/portal/projetos/${q.projectId}`} className={styles.cardLink}>
                  Ver projeto
                </Link>
              ) : q.status === "draft" ? (
                <span className={styles.cardMuted}>revisando</span>
              ) : null}
            </div>
            {q.status === "draft" && (
              <div className={styles.footNote}>
                Estamos revisando os detalhes. Avisamos por e-mail quando estiver pronto.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
