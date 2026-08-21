import { notFound } from "next/navigation";
import Badge from "@/components/admin/ui/Badge/Badge";
import Button from "@/components/admin/ui/Button/Button";
import { getProject } from "@/lib/portal/services/projects";
import { listInvoices } from "@/lib/portal/services/invoices";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  invoiceStatusLabel,
  invoiceStatusTone,
  orderStatusTone,
} from "@/lib/admin/format";
import styles from "./ProjectDetail.module.scss";

export default async function PortalProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, allInvoices] = await Promise.all([getProject(id), listInvoices()]);
  if (!project) notFound();

  const invoices = allInvoices.filter((i) => i.projectId === id);

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.back}>← voltar para meus projetos</div>
        <h1 className={styles.title}>{project.title}</h1>
        <div style={{ marginTop: 10 }}>
          <Badge tone={orderStatusTone(project.status)}>{project.statusLabel}</Badge>
        </div>
        <p className={styles.sub}>
          Começou em {formatDate(project.startDate)} · entrega prevista para {formatDate(project.dueDate)}
        </p>
      </div>

      <div className={styles.sec}>
        <div className={styles.kick}>andamento</div>
        <div className={styles.steps}>
          {project.steps.map((s) => (
            <div
              key={s.label}
              className={`${styles.step} ${s.done ? styles.stepDone : ""} ${s.current ? styles.stepNow : ""}`}
            >
              <b />
              {s.label}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.sec}>
        <div className={styles.kick}>escopo aprovado</div>
        <p className={styles.subSmall}>O que combinamos no orçamento aprovado.</p>
        {project.scopeItems.map((item) => (
          <div key={item} className={styles.scopeItem}>
            <em>✓</em>
            <span>{item}</span>
          </div>
        ))}
      </div>

      {invoices.length > 0 && (
        <div className={styles.sec}>
          <div className={styles.kick}>faturas deste projeto</div>
          {invoices.map((inv) => (
            <div key={inv.id} className={styles.invoiceRow}>
              <b>{inv.installmentLabel}</b>
              <span className={styles.mono}>{formatCurrency(inv.amount)}</span>
              <span className={styles.mono}>{formatDate(inv.dueDate)}</span>
              <Badge tone={invoiceStatusTone(inv.status)}>{invoiceStatusLabel(inv.status)}</Badge>
            </div>
          ))}
        </div>
      )}

      {project.latestUpdate && (
        <div className={styles.sec}>
          <div className={styles.kick}>próximos passos</div>
          <div className={styles.updateCard}>
            {project.latestUpdate.message}
            <div className={styles.updateMeta}>
              atualizado em {formatDateTime(project.latestUpdate.at)} pela equipe DevButter
            </div>
          </div>
        </div>
      )}

      <div className={styles.sec}>
        <div className={styles.contactRow}>
          <span className={styles.mono}>Dúvida sobre este projeto?</span>
          <Button variant="outline" href="/portal">
            Falar com a DevButter
          </Button>
        </div>
      </div>
    </div>
  );
}
