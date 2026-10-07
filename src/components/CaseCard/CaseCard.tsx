import Link from "next/link";
import { sectorLabel, type CaseStudy } from "@/content/cases";
import styles from "./CaseCard.module.scss";

/**
 * Case card shared by the home rail (`variant="rail"`, green tags) and the
 * /cases grid (`variant="grid"`, neutral tags), as in the prototype.
 */
export default function CaseCard({
  item,
  variant = "grid",
}: {
  item: CaseStudy;
  variant?: "rail" | "grid";
}) {
  return (
    <Link href={`/cases/${item.id}`} className={`${styles.card} ${styles[variant]}`}>
      <span className={styles.sector}>{sectorLabel(item.sector)}</span>
      <h3 className={styles.title}>{item.title}</h3>
      <p className={styles.headline}>{item.headline}</p>
      <span className={styles.tags}>
        {item.tags.map((t) => (
          <span key={t} className={styles.tag}>
            {t}
          </span>
        ))}
      </span>
      <span className={styles.more} aria-hidden="true">
        Ver case →
      </span>
    </Link>
  );
}
