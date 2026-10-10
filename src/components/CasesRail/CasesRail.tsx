import Link from "next/link";
import CaseCard from "@/components/CaseCard/CaseCard";
import { HOME_CASES } from "@/content/cases";
import styles from "./CasesRail.module.scss";

/** Home · trilho horizontal de cases (os 4 primeiros de content/cases.ts). */
export default function CasesRail() {
  return (
    <section className={styles.section} aria-labelledby="home-cases">
      <div className={styles.eyebrow}>Cases</div>
      <div className={styles.headRow}>
        <h2 id="home-cases" className={styles.h2}>
          Problemas que deixaram de doer.
        </h2>
        <span className={styles.hint} aria-hidden="true">
          arraste para o lado →
        </span>
      </div>
      <p className={styles.intro}>Cada case começa pelo que incomodava — a tecnologia vem depois.</p>
      <div className={styles.rail} tabIndex={0} role="region" aria-label="Cases em destaque (role para o lado)">
        {HOME_CASES.map((c) => (
          <CaseCard key={c.id} item={c} variant="rail" />
        ))}
        <Link href="/cases" className={styles.more}>
          <span className={styles.moreIcon} aria-hidden="true">
            →
          </span>
          <span className={styles.moreTitle}>Ver todos</span>
          <span className={styles.moreSub}>por setor</span>
        </Link>
      </div>
    </section>
  );
}
