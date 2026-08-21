import Link from "next/link";
import { listClients } from "@/lib/admin/services/clients";
import { formatDate } from "@/lib/admin/format";
import Badge from "@/components/admin/ui/Badge/Badge";
import styles from "@/styles/AdminList.module.scss";

const COLUMNS = "1.3fr 1.6fr 1fr .6fr .6fr .8fr";

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const clients = await listClients(q);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Clientes</h1>
        <form className={styles.headerActions}>
          <input className={styles.search} name="q" defaultValue={q} placeholder="buscar cliente…" />
        </form>
      </div>

      <div className={styles.panel}>
        <div className={styles.headerRow} style={{ ["--cols" as string]: COLUMNS }}>
          <span>cliente</span>
          <span>e-mail</span>
          <span>asaas</span>
          <span>quotes</span>
          <span>orders</span>
          <span>desde</span>
        </div>
        {clients.length === 0 && <div className={styles.empty}>Nenhum cliente encontrado.</div>}
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/admin/clients/${c.id}`}
            className={styles.row}
            style={{ ["--cols" as string]: COLUMNS }}
          >
            <span style={{ fontWeight: 600 }}>{c.name}</span>
            <span style={{ color: "var(--db-text-secondary)", fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
              {c.email}
            </span>
            <Badge tone={c.asaas_customer_id ? "green" : "neutral"}>
              {c.asaas_customer_id ? "vinculado" : "não vinculado"}
            </Badge>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>{c.quotes_count}</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>{c.orders_count}</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--db-text-muted)" }}>
              {formatDate(c.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
