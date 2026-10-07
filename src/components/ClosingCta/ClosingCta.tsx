import ConciergeCta from "@/components/ConciergeCta/ConciergeCta";
import styles from "./ClosingCta.module.scss";

export default function ClosingCta() {
  return (
    <section className={styles.section}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>
        <h2 className={styles.h2}>Vamos entender seu problema primeiro.</h2>
        {/* "e uma faixa de preço" saiu: preço só após revisão (plano-preco-so-apos-aprovacao.md) */}
        <p className={styles.subtext}>
          Uma conversa curta, sem formulário longo. Você sai com caminhos e prazos — o valor vem
          depois, revisado por um engenheiro.
        </p>
        <ConciergeCta className={styles.cta}>Começar a conversa</ConciergeCta>
      </div>
    </section>
  );
}
