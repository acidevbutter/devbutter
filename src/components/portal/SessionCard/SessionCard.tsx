import Link from "next/link";
import Logomark from "@/components/icons/Logomark";
import styles from "./SessionCard.module.scss";

export default function SessionCard({
  title,
  body,
  ctaLabel,
  ctaHref,
  secondary,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  secondary?: { label: string; href: string };
}) {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Logomark width={24} height={28} />
          <span className={styles.wordmark}>
            Dev<span className="gn">Butter</span>
          </span>
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.body}>{body}</p>
        <Link href={ctaHref} className={styles.cta}>
          {ctaLabel}
        </Link>
        {secondary && (
          <Link href={secondary.href} className={styles.ctaGhost}>
            {secondary.label}
          </Link>
        )}
      </div>
    </div>
  );
}
