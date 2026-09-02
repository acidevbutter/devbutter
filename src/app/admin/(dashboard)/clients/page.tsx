import Link from "next/link";
import { listClients } from "@/lib/admin/services/clients";
import { formatDate } from "@/lib/admin/format";
import Badge from "@/components/admin/ui/Badge/Badge";
import styles from "@/styles/AdminList.module.scss";

const COLUMNS = "1.2fr 1.4fr 1.1fr .4fr .4fr .9fr .6fr";
const PAGE_SIZE = 20;

type Filter = "pendente" | "order" | "sem_asaas";

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string; p?: string }>;
}) {
  const { q, f, p } = await searchParams;
  const all = await listClients(q);

  const filter = (["pendente", "order", "sem_asaas"] as Filter[]).includes(f as Filter)
    ? (f as Filter)
    : undefined;

  const counts = {
    pendente: all.filter((c) => c.quotes_count > 0).length,
    order: all.filter((c) => c.orders_count > 0).length,
    sem_asaas: all.filter((c) => !c.asaas_customer_id).length,
  };

  const filtered = all.filter((c) => {
    if (filter === "pendente") return c.quotes_count > 0;
    if (filter === "order") return c.orders_count > 0;
    if (filter === "sem_asaas") return !c.asaas_customer_id;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(Number(p) || 1, 1), totalPages);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function href(next: { f?: Filter | null; p?: number }) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const nf = "f" in next ? next.f : filter;
    if (nf) params.set("f", nf);
    if (next.p && next.p > 1) params.set("p", String(next.p));
    const qs = params.toString();
    return qs ? `/admin/clients?${qs}` : "/admin/clients";
  }

  return (
    <div className={styles.page}>
      <div className={styles.countBar}>
        <span>Clientes</span>
        <span className={styles.countBarValue}>{all.length} registros</span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Clientes</h1>
        <form className={styles.headerActions}>
          <input
            className={styles.search}
            style={{ width: 300 }}
            name="q"
            defaultValue={q}
            placeholder="buscar por nome, e-mail ou documento…"
          />
        </form>
      </div>

      <div className={styles.chips}>
        <Link
          href={href({ f: filter === "pendente" ? null : "pendente" })}
          className={`${styles.chip} ${filter === "pendente" ? styles.chipActive : styles.chipAmber}`}
        >
          com quote pendente {counts.pendente}
        </Link>
        <Link
          href={href({ f: filter === "order" ? null : "order" })}
          className={`${styles.chip} ${filter === "order" ? styles.chipActive : ""}`}
        >
          com order ativa {counts.order}
        </Link>
        <Link
          href={href({ f: filter === "sem_asaas" ? null : "sem_asaas" })}
          className={`${styles.chip} ${filter === "sem_asaas" ? styles.chipActive : ""}`}
        >
          sem Asaas {counts.sem_asaas}
        </Link>
      </div>

      <div className={styles.panel}>
        <div className={styles.headerRow} style={{ ["--cols" as string]: COLUMNS }}>
          <span>nome</span>
          <span>e-mail</span>
          <span>documento</span>
          <span>qt</span>
          <span>or</span>
          <span>asaas</span>
          <span>desde</span>
        </div>
        {rows.length === 0 && <div className={styles.empty}>Nenhum cliente encontrado.</div>}
        {rows.map((c, i) => (
          <Link
            key={c.id}
            href={`/admin/clients/${c.id}`}
            className={styles.row}
            style={{
              ["--cols" as string]: COLUMNS,
              animation: "dbRise .26s ease-out both",
              animationDelay: `${i * 40}ms`,
            }}
          >
            <span style={{ fontWeight: 600 }}>{c.name}</span>
            <span
              style={{ color: "var(--admin-text-2)", fontFamily: "'Geist Mono', monospace", fontSize: 12 }}
            >
              {c.email}
            </span>
            <span
              style={{ color: "var(--admin-text-2)", fontFamily: "'Geist Mono', monospace", fontSize: 12 }}
            >
              {c.cnpj ?? c.cpf ?? "—"}
            </span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
              {c.quotes_count}
            </span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
              {c.orders_count}
            </span>
            <Badge
              tone={c.asaas_customer_id ? "green" : "amber"}
              style={{ justifySelf: "start" }}
            >
              {c.asaas_customer_id ? "vinculado" : "não vinc."}
            </Badge>
            <span
              style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--db-text-muted)" }}
            >
              {formatDate(c.created_at)}
            </span>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {page > 1 ? (
            <Link href={href({ p: page - 1 })}>‹</Link>
          ) : (
            <span data-nav aria-disabled="true">‹</span>
          )}
          <span>
            página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={href({ p: page + 1 })}>›</Link>
          ) : (
            <span data-nav aria-disabled="true">›</span>
          )}
        </div>
      )}
    </div>
  );
}
