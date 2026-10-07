import type { Metadata } from "next";
import ConciergeCta from "@/components/ConciergeCta/ConciergeCta";
import ContactForm from "./ContactForm";
import styles from "./Contato.module.scss";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fala com a gente: conte o problema na conversa de diagnóstico ou deixe um recado. Resposta em horário comercial, por alguém do time.",
  alternates: { canonical: "/contato" },
  openGraph: { title: "Contato · DevButter", url: "/contato" },
};

export default function ContatoPage() {
  return (
    <section className={styles.section}>
      <div className={styles.info}>
        <div className={styles.eyebrow}>Contato</div>
        <h1 className={styles.title}>Fala com a gente.</h1>
        {/* "e uma faixa" saiu: preço só depois da revisão (plano-preco-so-apos-aprovacao.md) */}
        <p className={styles.lead}>
          O jeito mais rápido é contar o problema na conversa — você já sai com caminhos e prazos.
          Se preferir, deixe um recado.
        </p>
        <ConciergeCta className={styles.cta}>Começar a conversa</ConciergeCta>
        <dl className={styles.facts}>
          <dt>e-mail</dt>
          <dd>
            <a href="mailto:contato@devbutter.tech">contato@devbutter.tech</a>
          </dd>
          <dt>onde</dt>
          <dd>São Paulo · atendimento remoto em todo o Brasil</dd>
          <dt>resposta</dt>
          <dd>em horário comercial, por alguém do time</dd>
        </dl>
      </div>
      <div className={styles.formCard}>
        <ContactForm />
      </div>
    </section>
  );
}
