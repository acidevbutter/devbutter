import Link from "next/link";
import Badge from "@/components/admin/ui/Badge/Badge";
import Button from "@/components/admin/ui/Button/Button";
import NewQuoteButton from "@/components/portal/NewQuoteModal/NewQuoteButton";
import { getPortalAccount } from "@/lib/portal/session";
import { listProjects } from "@/lib/portal/services/projects";
import { listQuotes } from "@/lib/portal/services/quotes";
import { listInvoices } from "@/lib/portal/services/invoices";
import { formatCurrency, formatDate, orderStatusTone } from "@/lib/admin/format";
import styles from "./Overview.module.scss";

export default async function PortalOverviewPage() {
  const [account, projects, quotes, invoices] = await Promise.all([
    getPortalAccount(),
    listProjects(),
    listQuotes(),
    listInvoices(),
  ]);

  const firstName = account.name.split(" ")[0];
  const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE");
  const reviewQuotes = quotes.filter((q) => q.status === "draft");

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Olá, {firstName}</h1>
        <p className={styles.subtitle}>
          {overdueInvoices.length > 0 ? `Você tem ${overdueInvoices.length} fatura vencida` : "Nenhuma fatura vencida"}
          {reviewQuotes.length > 0
            ? ` e ${reviewQuotes.length} orçamento em análise.`
            : "."}
        </p>
      </div>

      {(overdueInvoices.length > 0 || reviewQuotes.length > 0) && (
        <div className={styles.pending}>
          {overdueInvoices.map((inv) => (
            <div key={inv.id} className={`${styles.pendingCard} ${styles.pendingHot}`}>
              <div>
                <div className={styles.pendingKick}>fatura vencida</div>
                <div className={styles.pendingAmount}>{formatCurrency(inv.amount)}</div>
                <div className={styles.pendingMeta}>
                  venceu em {formatDate(inv.dueDate)} · {inv.projectTitle}
                </div>
              </div>
              <Button variant="danger" href="/portal/faturas">
                Pagar agora
              </Button>
            </div>
          ))}
          {reviewQuotes.map((q) => (
            <div key={q.id} className={styles.pendingCard}>
              <div>
                <div className={styles.pendingKick}>orçamento em análise</div>
                <div className={styles.pendingTitle}>{q.title}</div>
                <div className={styles.pendingMeta}>
                  enviado em {formatDate(q.createdAt)} · a DevButter está revisando
                </div>
              </div>
              <Button variant="outline" href="/portal/orcamentos">
                Ver
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.kick}>projetos ativos</div>
        <div className={styles.projects}>
          {projects.map((p) => (
            <Link key={p.id} href={`/portal/projetos/${p.id}`} className={styles.projectCard}>
              <div className={styles.projectTop}>
                <span className={styles.projectTitle}>{p.title}</span>
                <Badge tone={orderStatusTone(p.status)}>{p.statusLabel}</Badge>
              </div>
              <div className={styles.progress}>
                <i style={{ width: `${p.progressPct}%` }} />
              </div>
              <div className={styles.projectMeta}>
                etapa {p.steps.filter((s) => s.done).length + 1} de {p.steps.length} · entrega prevista{" "}
                {formatDate(p.dueDate)}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.cta}>
        <div>
          <div className={styles.ctaTitle}>Quer contratar mais um serviço?</div>
          <div className={styles.ctaHint}>conte o que precisa e a gente monta um orçamento</div>
        </div>
        <NewQuoteButton />
      </div>
    </div>
  );
}
