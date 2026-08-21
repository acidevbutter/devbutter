import Link from "next/link";
import { listConversations, getConversation } from "@/lib/admin/services/conversations";
import { formatDate } from "@/lib/admin/format";
import styles from "./Conversations.module.scss";

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ has_quote?: string; open?: string }>;
}) {
  const { has_quote, open } = await searchParams;
  const hasQuote = has_quote === undefined ? undefined : has_quote === "true";
  const conversations = await listConversations({ hasQuote });

  const selectedId = open ?? conversations[0]?.id;
  const selected = selectedId ? await getConversation(selectedId) : null;

  function filterHref(value: boolean | undefined) {
    return value === undefined ? "/admin/conversations" : `/admin/conversations?has_quote=${value}`;
  }

  return (
    <div className={styles.layout}>
      <div className={styles.side}>
        <div className={styles.filters}>
          <Link href={filterHref(true)} className={`${styles.filterChip} ${hasQuote === true ? styles.filterChipActive : ""}`}>
            gerou quote
          </Link>
          <Link href={filterHref(false)} className={`${styles.filterChip} ${hasQuote === false ? styles.filterChipActive : ""}`}>
            não gerou
          </Link>
        </div>

        {conversations.map((c) => (
          <Link
            key={c.id}
            href={`/admin/conversations?open=${c.id}${has_quote !== undefined ? `&has_quote=${has_quote}` : ""}`}
            className={`${styles.entry} ${c.id === selectedId ? styles.entryActive : ""}`}
          >
            <div className={styles.entryName}>{c.account_name ?? "visitante anônimo"}</div>
            <div className={styles.entryMeta}>
              {formatDate(c.started_at)} · {c.message_count} msgs ·{" "}
              {c.resulting_quote_id ? c.resulting_quote_id.replace("mock-quote-", "").toUpperCase() : "sem quote"}
            </div>
          </Link>
        ))}
      </div>

      <div className={styles.transcript}>
        {selected ? (
          <>
            <div className={styles.messages}>
              {selected.messages.map((m, i) => (
                <div key={i} className={`${styles.bubble} ${m.role === "visitor" ? styles.bubbleVisitor : ""}`}>
                  {m.content}
                </div>
              ))}
            </div>
            {selected.draft && (
              <div className={styles.draft}>
                <div style={{ font: "500 10px 'Geist Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--db-green)" }}>
                  draft gerado pela IA
                </div>
                <div style={{ marginTop: 8, fontSize: 13.5 }}>escopo: {selected.draft.scope_summary}</div>
                <div style={{ marginTop: 4, fontSize: 13.5, color: "var(--db-text-secondary)" }}>
                  faixa: {selected.draft.price_range} · prazo: {selected.draft.timeline}
                </div>
                {selected.resulting_quote_id && (
                  <Link
                    href={`/admin/quotes/${selected.resulting_quote_id}`}
                    style={{ marginTop: 10, display: "inline-block", fontSize: 12.5, color: "var(--db-green)" }}
                  >
                    Abrir quote →
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: "var(--db-text-muted)", fontSize: 13 }}>Nenhuma conversa encontrada.</div>
        )}
      </div>
    </div>
  );
}
