"use client";

import { useState } from "react";
import Badge from "@/components/admin/ui/Badge/Badge";
import PaymentMethods from "@/components/portal/PaymentMethods/PaymentMethods";
import PaymentStatus from "@/components/portal/PaymentStatus/PaymentStatus";
import PixBoletoView from "@/components/portal/PixBoletoView/PixBoletoView";
import { formatCurrency, formatDate, invoiceStatusLabel, invoiceStatusTone } from "@/lib/admin/format";
import type { PortalInvoice } from "@/lib/portal/types";
import styles from "./Invoices.module.scss";

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "open", label: "Em aberto" },
  { key: "paid", label: "Pagas" },
  { key: "overdue", label: "Vencidas" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function matchesFilter(invoice: PortalInvoice, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "paid") return invoice.status === "RECEIVED";
  if (filter === "overdue") return invoice.status === "OVERDUE";
  return invoice.status === "PENDING";
}

export default function InvoicesClient({ invoices }: { invoices: PortalInvoice[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;

  const filtered = invoices.filter((i) => matchesFilter(i, filter));
  const expanded = invoices.find((i) => i.id === expandedId) ?? null;
  const [paymentState, setPaymentState] = useState<string | null>(null);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Faturas</h1>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`${styles.chip} ${filter === f.key ? styles.chipActive : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === "overdue" && overdueCount > 0 ? ` ${overdueCount}` : ""}
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        <div className={styles.headerRow}>
          <span>projeto</span>
          <span>valor</span>
          <span>vencimento</span>
          <span>status</span>
          <span />
        </div>
        {filtered.length === 0 && <div className={styles.empty}>nenhuma fatura nesse filtro</div>}
        {filtered.map((inv) => (
          <button
            key={inv.id}
            type="button"
            className={`${styles.row} ${inv.status === "OVERDUE" ? styles.rowAlert : ""}`}
            onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
          >
            <b>{inv.projectTitle}</b>
            <span className={styles.mono}>{formatCurrency(inv.amount)}</span>
            <span className={styles.mono}>{formatDate(inv.dueDate)}</span>
            <Badge tone={invoiceStatusTone(inv.status)}>{invoiceStatusLabel(inv.status)}</Badge>
            <span className={styles.mono}>{inv.status === "RECEIVED" ? "recibo" : ""}</span>
          </button>
        ))}
      </div>

      {expanded && (
        <div className={styles.expandedPanel}>
          <div className={styles.expandedTop}>
            <div>
              <div className={styles.expandedAmount}>{formatCurrency(expanded.amount)}</div>
              <div className={styles.expandedMeta}>
                {expanded.status === "OVERDUE" ? "vencida" : "vence"} em {formatDate(expanded.dueDate)} ·{" "}
                {expanded.projectTitle}
              </div>
            </div>
            <Badge tone={invoiceStatusTone(expanded.status)}>{invoiceStatusLabel(expanded.status)}</Badge>
          </div>
          <div className={styles.expandedGrid}>
            <PixBoletoView
              pixCode={expanded.pixCode}
              boletoUrl={expanded.boletoUrl}
              billingType={expanded.billingType}
              amount={expanded.amount}
              dueDate={expanded.dueDate}
              projectTitle={expanded.projectTitle}
            />
            <div className={styles.stack}>
              <PaymentMethods invoiceId={expanded.id} onPaymentSubmitted={setPaymentState} />
            </div>
          </div>
          <div className={styles.note}>links vêm do Asaas; a tela só exibe o que o pagamento devolveu</div>
          {paymentState && (
            <PaymentStatus
              state={paymentState}
              invoiceHref="/portal/faturas"
              onRetry={() => setPaymentState(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
