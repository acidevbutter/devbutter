import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ConciergeCta from "@/components/ConciergeCta/ConciergeCta";
import { CASES, getCase, sectorLabel } from "@/content/cases";
import styles from "./CaseDetail.module.scss";

// Só os slugs de content/cases.ts existem; qualquer outro vira 404 (sem render sob demanda).
export const dynamicParams = false;

export function generateStaticParams() {
  return CASES.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/cases/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = getCase(slug);
  if (!item) return {};
  return {
    title: `${item.title} — ${item.headline}`,
    description: `${item.before} ${item.after}`,
    alternates: { canonical: `/cases/${item.id}` },
    openGraph: {
      type: "article",
      title: `${item.title} · DevButter`,
      description: item.headline,
      url: `/cases/${item.id}`,
    },
  };
}

export default async function CaseDetailPage({ params }: PageProps<"/cases/[slug]">) {
  const { slug } = await params;
  const item = getCase(slug);
  if (!item) notFound();

  return (
    <article className={styles.section}>
      <Link href="/cases" className={styles.back}>
        ← todos os cases
      </Link>
      <div className={styles.sector}>{sectorLabel(item.sector)}</div>
      <h1 className={styles.title}>{item.headline}</h1>
      <div className={styles.meta}>
        <span className={styles.client}>{item.title}</span>
        <span aria-hidden="true">·</span>
        <span>{item.duration}</span>
        {item.tags.map((t) => (
          <span key={t} className={styles.tag}>
            {t}
          </span>
        ))}
      </div>

      <div className={styles.compare}>
        <section className={styles.before} aria-label="Antes">
          <div className={styles.compareLabel}>antes</div>
          <p className={styles.compareText}>{item.before}</p>
        </section>
        <section className={styles.after} aria-label="Depois">
          <div className={styles.compareLabel}>depois</div>
          <p className={styles.compareText}>{item.after}</p>
        </section>
      </div>

      <dl className={styles.story}>
        <dt>o problema</dt>
        <dd>{item.problem}</dd>
        <dt>o que construímos</dt>
        <dd>{item.built}</dd>
        <dt>como ficou</dt>
        <dd>{item.result}</dd>
      </dl>

      <aside className={styles.ctaBox}>
        <div>
          <div className={styles.ctaTitle}>Tem um problema parecido?</div>
          {/* "uma faixa" saiu: preço só depois da revisão (plano-preco-so-apos-aprovacao.md) */}
          <div className={styles.ctaText}>
            Conta pra gente. Em poucos minutos você tem caminhos e prazos.
          </div>
        </div>
        <ConciergeCta className={styles.cta}>Começar a conversa</ConciergeCta>
      </aside>
    </article>
  );
}
