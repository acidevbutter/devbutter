import Link from "next/link";
import { adminFetch } from "@/lib/admin/api";
import { getDashboardData } from "@/lib/admin/services/dashboard";
import { resolveClientLabel } from "@/lib/admin/services/clients";
import { formatCurrency, formatRelative } from "@/lib/admin/format";
import Badge from "@/components/admin/ui/Badge/Badge";
import Button from "@/components/admin/ui/Button/Button";
import type { AccountRead } from "@/lib/admin/types";
import styles from "./Dashboard.module.scss";

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function AdminDashboardPage() {
  const [account, { metrics, reviewQueue }] = await Promise.all([
    adminFetch<AccountRead>("/accounts/me"),
    getDashboardData(),
  ]);

  const clientLabels = await Promise.all(
    reviewQueue.map((quote) => resolveClientLabel(quote.account_id))
  );

  const now = new Date();
  const firstName = account.name.split(" ")[0];

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>
          {greeting(now.getHours())}, {firstName}
        </h1>
        <div className={styles.subtitle}>
          {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} ·{" "}
          {reviewQueue.length} {reviewQueue.length === 1 ? "item pede" : "itens pedem"} sua atenção
        </div>
      </div>

      <div className={styles.tiles}>
        <div className={`${styles.tile} ${styles.tileWarn}`}>
          <div className={styles.tileLabelWarn}>p/ revisar</div>
          <div className={`${styles.tileValue} ${styles.tileValuePink}`}>{reviewQueue.length}</div>
          <div className={styles.tileHint}>quotes em draft</div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tileLabel}>orders</div>
          <div className={styles.tileValue}>{metrics.active_orders}</div>
          <div className={styles.tileHint}>ativas agora</div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tileLabel}>a receber</div>
          <div className={styles.tileValue}>{formatCurrency(metrics.receivable_open_amount)}</div>
          <div className={styles.tileHint}>invoices em aberto</div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tileLabel}>vencida</div>
          <div className={`${styles.tileValue} ${styles.tileValuePink}`}>
            {metrics.overdue_invoice_count}
          </div>
          <div className={styles.tileHint}>
            {formatCurrency(metrics.overdue_amount)} · {metrics.overdue_client_name}
          </div>
        </div>
      </div>

      <div className={styles.queuePanel}>
        <div className={styles.queueHeader}>
          <div className={styles.queueTitle}>Quotes aguardando revisão</div>
          <div className={styles.queueHint}>único gate antes do Asaas</div>
        </div>

        {reviewQueue.length > 0 ? (
          <div className={styles.queueTable}>
            <div className={styles.queueHeaderRow}>
              <span>cliente</span>
              <span>escopo</span>
              <span>faixa</span>
              <span>origem</span>
              <span />
            </div>
            {reviewQueue.map((quote, i) => (
              <Link
                key={quote.id}
                href={`/admin/quotes/${quote.id}`}
                className={styles.queueRow}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className={styles.queueClient}>{clientLabels[i]}</span>
                <span className={styles.queueScope}>{quote.scope_summary}</span>
                <span className={styles.queueRange}>{quote.price_range ?? "—"}</span>
                <Badge tone={quote.source === "ai" ? "green" : "neutral"} style={{ justifySelf: "start" }}>
                  {quote.source === "ai" ? "IA" : "manual"}
                </Badge>
                <Button variant="solid" size="row" style={{ justifySelf: "end" }}>
                  Revisar
                </Button>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.queueEmpty}>
            <div className={styles.queueEmptyTitle}>Nada aguardando revisão</div>
            <div className={styles.queueEmptyHint}>
              todos os quotes foram respondidos · próximo passo: acompanhar orders
            </div>
          </div>
        )}
      </div>

      <div className={styles.lowerGrid}>
        <div>
          <div className={styles.sectionLabel}>atividade recente</div>
          <div className={styles.activityList}>
            {metrics.recent_activity.map((activity, i) => (
              <div key={i} className={styles.activityItem}>
                <span className={i < 2 ? styles.dotRecent : styles.dotOld}>●</span> {activity.message}{" "}
                · {formatRelative(activity.at)}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.shortcuts}>
          <div className={styles.sectionLabel} style={{ marginBottom: 0 }}>
            atalhos
          </div>
          <div className={styles.shortcutsList}>
            <Link href="/admin/quotes/new" className={`${styles.shortcut} ${styles.shortcutPrimary}`}>
              + Novo quote manual
            </Link>
            <Link href="/admin/knowledge" className={styles.shortcut}>
              Nova entrada de precificação
            </Link>
            <Link href="/admin/conversations?has_quote=false" className={styles.shortcut}>
              Ver conversas sem quote
            </Link>
            <Link href="/admin/mind" className={styles.shortcut}>
              Abrir métricas da IA
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
