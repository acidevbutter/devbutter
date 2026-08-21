import Link from "next/link";
import { listCatalogEntries } from "@/lib/admin/services/catalog";
import { formatDate } from "@/lib/admin/format";
import styles from "@/styles/AdminList.module.scss";

const COLUMNS = "1.3fr 1fr 2fr .8fr";

export default async function AdminCatalogPage() {
  const entries = await listCatalogEntries();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Catálogo</h1>
      </div>

      <div className={styles.panel}>
        <div className={styles.headerRow} style={{ ["--cols" as string]: COLUMNS }}>
          <span>cliente</span>
          <span>tipo</span>
          <span>descrição</span>
          <span>criado</span>
        </div>
        {entries.length === 0 && <div className={styles.empty}>Nenhuma entrada de catálogo.</div>}
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/admin/clients/${entry.account_id}?tab=catalog`}
            className={styles.row}
            style={{ ["--cols" as string]: COLUMNS }}
          >
            <span style={{ fontWeight: 600 }}>{entry.account_name}</span>
            <span style={{ color: "var(--db-text-secondary)" }}>{entry.type}</span>
            <span style={{ color: "var(--db-text-secondary)" }}>{entry.description}</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--db-text-muted)" }}>
              {formatDate(entry.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
