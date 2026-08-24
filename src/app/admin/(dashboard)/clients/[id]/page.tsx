import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/admin/services/clients";
import { listAllQuotesForTable } from "@/lib/admin/services/quotes";
import { listOrders } from "@/lib/admin/services/orders";
import { listInvoices } from "@/lib/admin/services/invoices";
import { listCatalogEntries } from "@/lib/admin/services/catalog";
import { listConversations } from "@/lib/admin/services/conversations";
import { formatCurrency, formatDate, invoiceStatusLabel, invoiceStatusTone, orderStatusTone, quoteStatusTone } from "@/lib/admin/format";
import Badge from "@/components/admin/ui/Badge/Badge";
import Button from "@/components/admin/ui/Button/Button";
import styles from "./ClientDetail.module.scss";

const TABS = [
  { key: "quotes", label: "Quotes" },
  { key: "orders", label: "Orders" },
  { key: "invoices", label: "Invoices" },
  { key: "catalog", label: "Catálogo" },
  { key: "conversations", label: "Conversas" },
] as const;

export default async function AdminClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "quotes" } = await searchParams;

  const client = await getClient(id);
  if (!client) notFound();

  const [allQuotes, allOrders, allInvoices, allCatalog, allConversations] = await Promise.all([
    listAllQuotesForTable(),
    listOrders(),
    listInvoices(),
    listCatalogEntries(),
    listConversations(),
  ]);

  const quotes = allQuotes.filter((q) => q.account_id === id);
  const orders = allOrders.filter((o) => o.account_id === id);
  const orderIds = new Set(orders.map((o) => o.id));
  const invoices = allInvoices.filter((i) => orderIds.has(i.order_id));
  const catalog = allCatalog.filter((c) => c.account_id === id);
  const conversations = allConversations.filter((c) => c.account_id === id);

  return (
    <div className={styles.panel}>
      <div className={styles.breadcrumb}>
        Clientes / <span style={{ color: "var(--db-text-primary)" }}>{client.name}</span>
      </div>

      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.name}>{client.business_name ?? client.name}</h1>
            <div className={styles.meta}>
              {client.email}
              {client.cnpj ? ` · CNPJ ${client.cnpj}` : ""} · cliente desde{" "}
              {formatDate(client.created_at)}
            </div>
          </div>
          <div className={styles.headerActions}>
            <Button href="/admin/quotes/new">+ Novo quote</Button>
            <Button variant="outline">Editar dados</Button>
          </div>
        </div>

        <div className={styles.infoCards}>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>asaas customer</div>
            <div className={styles.infoValue}>{client.asaas_customer_id ?? "—"}</div>
            <div style={{ marginTop: 8 }}>
              <Badge tone={client.asaas_status === "vinculado" ? "green" : "amber"}>
                ● {client.asaas_status === "vinculado" ? "vinculado" : "não vinculado"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/clients/${id}?tab=${t.key}`}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
          >
            {t.label} {client.counts[t.key as keyof typeof client.counts] ?? ""}
          </Link>
        ))}
      </div>

      <div className={styles.tabContent}>
        {tab === "quotes" &&
          (quotes.length ? (
            <TableList
              columns=".6fr 2fr .8fr .8fr .6fr"
              header={["id", "escopo", "faixa", "status", "data"]}
              rows={quotes.map((q) => [
                <Link key="id" href={`/admin/quotes/${q.id}`} style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
                  {q.id.slice(0, 8).toUpperCase()}
                </Link>,
                q.scope_summary,
                q.price_range ?? "—",
                <Badge key="status" tone={quoteStatusTone(q.status)}>{q.status}</Badge>,
                formatDate(q.created_at),
              ])}
            />
          ) : (
            <Empty label="Nenhum quote para este cliente." />
          ))}

        {tab === "orders" &&
          (orders.length ? (
            <TableList
              columns=".6fr 1.4fr .8fr .8fr"
              header={["id", "valor", "status", "data"]}
              rows={orders.map((o) => [
                <Link key="id" href={`/admin/orders/${o.id}`} style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
                  #{o.id.slice(0, 8)}
                </Link>,
                formatCurrency(o.amount),
                <Badge key="status" tone={orderStatusTone(o.status)}>{o.status}</Badge>,
                formatDate(o.created_at),
              ])}
            />
          ) : (
            <Empty label="Nenhuma order para este cliente." />
          ))}

        {tab === "invoices" &&
          (invoices.length ? (
            <TableList
              columns="1fr 1fr .8fr .8fr"
              header={["order", "valor", "venc.", "status"]}
              rows={invoices.map((i) => [
                `#${i.order_id.slice(0, 8)}`,
                formatCurrency(i.amount),
                formatDate(i.due_date),
                <Badge key="status" tone={invoiceStatusTone(i.status)}>{invoiceStatusLabel(i.status)}</Badge>,
              ])}
            />
          ) : (
            <Empty label="Nenhuma invoice para este cliente." />
          ))}

        {tab === "catalog" &&
          (catalog.length ? (
            <TableList
              columns="1fr 2fr .8fr"
              header={["tipo", "descrição", "criado"]}
              rows={catalog.map((c) => [c.type, c.description, formatDate(c.created_at)])}
            />
          ) : (
            <Empty label="Nenhuma entrada de catálogo." />
          ))}

        {tab === "conversations" &&
          (conversations.length ? (
            <TableList
              columns="1.4fr .6fr .8fr .8fr"
              header={["início", "mensagens", "quote", "data"]}
              rows={conversations.map((c) => [
                <Link key="id" href={`/admin/conversations?open=${c.id}`} style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
                  abrir transcript
                </Link>,
                String(c.message_count),
                c.resulting_quote_id ? "sim" : "não",
                formatDate(c.started_at),
              ])}
            />
          ) : (
            <Empty label="Nenhuma conversa para este cliente." />
          ))}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div style={{ color: "var(--db-text-muted)", fontFamily: "'Geist Mono', monospace", fontSize: 13 }}>{label}</div>;
}

function TableList({
  columns,
  header,
  rows,
}: {
  columns: string;
  header: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div style={{ background: "var(--admin-card)", border: "1px solid var(--admin-border)", borderRadius: 12, overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns,
          gap: 12,
          padding: "10px 14px",
          font: "500 10px 'Geist Mono', monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--db-text-muted)",
          borderBottom: "1px solid var(--admin-border)",
        }}
      >
        {header.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: columns,
            gap: 12,
            padding: "12px 14px",
            fontSize: 13.5,
            borderBottom: i === rows.length - 1 ? "none" : "1px solid rgba(255,255,255,.05)",
            alignItems: "center",
          }}
        >
          {row.map((cell, j) => (
            <span key={j}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
