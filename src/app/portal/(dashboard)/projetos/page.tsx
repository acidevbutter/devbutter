import Link from "next/link";
import Badge from "@/components/admin/ui/Badge/Badge";
import { listProjects } from "@/lib/portal/services/projects";
import { formatDate, orderStatusTone } from "@/lib/admin/format";
import styles from "@/styles/AdminList.module.scss";

export default async function PortalProjectsPage() {
  const projects = await listProjects();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Meus projetos</h1>
      </div>

      <div className={styles.panel}>
        {projects.length === 0 && <div className={styles.empty}>nenhum projeto ainda</div>}
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/portal/projetos/${p.id}`}
            className={styles.row}
            style={{ ["--cols" as string]: "1.6fr .8fr .6fr .6fr" }}
          >
            <span style={{ fontWeight: 600 }}>{p.title}</span>
            <Badge tone={orderStatusTone(p.status)}>{p.statusLabel}</Badge>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
              {p.progressPct}%
            </span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--db-text-muted)" }}>
              entrega {formatDate(p.dueDate)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
