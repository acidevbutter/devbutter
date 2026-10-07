import Link from "next/link";
import styles from "./MethodSteps.module.scss";

// Etapa 02 dizia "Cada um com faixa de preço e prazo" — o preço só chega
// depois da revisão (docs/plano-preco-so-apos-aprovacao.md).
const STEPS = [
  {
    tag: "01 · OUVIR",
    title: "A operação antes da stack",
    body: "Uma conversa curta pra entender onde dói, quem mexe nisso e o que já existe.",
  },
  {
    tag: "02 · RECORTAR",
    title: "Dois ou três caminhos",
    body: "Cada um com escopo e prazo. Você escolhe por onde começar.",
  },
  {
    tag: "03 · CONSTRUIR",
    title: "Entregas curtas, à vista",
    body: "Tudo acompanhado na sua conta: etapas, demonstrações, conversa e faturas.",
  },
];

/** Home · "Como trabalhamos" (resumo; o método completo fica em /metodo). */
export default function MethodSteps() {
  return (
    <section className={styles.section} aria-labelledby="home-metodo">
      <div className={styles.eyebrow}>Como trabalhamos</div>
      <h2 id="home-metodo" className={styles.h2}>
        Ouvir, recortar, construir.
      </h2>
      <ol className={styles.steps}>
        {STEPS.map((s) => (
          <li key={s.tag} className={styles.step}>
            <div className={styles.tag}>{s.tag}</div>
            <div className={styles.title}>{s.title}</div>
            <p className={styles.body}>{s.body}</p>
          </li>
        ))}
      </ol>
      <Link href="/metodo" className={styles.more}>
        Ver o método completo →
      </Link>
    </section>
  );
}
