import Link from "next/link";
import { listCompanies } from "@/lib/admin/services/companies";
import Badge from "@/components/admin/ui/Badge/Badge";
import styles from "@/styles/AdminList.module.scss";

const COLUMNS = "1.4fr 1fr .9fr .8fr 1fr";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const companies = await listCompanies(q);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Empresas</h1>
        <form className={styles.headerActions}>
          <input
            className={styles.search}
            name="q"
            defaultValue={q}
            placeholder="buscar empresa, CNPJ…"
          />
        </form>
      </div>

      <div className={styles.panel}>
        <div className={styles.headerRow} style={{ ["--cols" as string]: COLUMNS }}>
          <span>empresa</span>
          <span>dono</span>
          <span>meio de pagamento</span>
          <span>cota</span>
          <span>% em uso</span>
        </div>
        {companies.length === 0 && (
          <div className={styles.empty}>Nenhuma empresa encontrada.</div>
        )}
        {companies.map((c) => (
          <Link
            key={c.id}
            href={`/admin/companies/${c.id}`}
            className={styles.row}
            style={{ ["--cols" as string]: COLUMNS }}
          >
            <span style={{ fontWeight: 600 }}>{c.name}</span>
            <span
              style={{
                color: "var(--db-text-secondary)",
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
              }}
            >
              {c.owner_name}
            </span>
            <Badge tone={c.has_payment_method ? "green" : "neutral"}>
              {c.has_payment_method ? "configurado" : "não configurado"}
            </Badge>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
              {c.split_quota_percent ? `${c.split_quota_percent}%` : "sem teto"}
            </span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
              {c.used_percent ? `${c.used_percent}%` : "—"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
