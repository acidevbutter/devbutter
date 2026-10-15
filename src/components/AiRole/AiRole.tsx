import SiteSceneCanvas from "@/components/SiteScene/SiteSceneCanvas";
import styles from "./AiRole.module.scss";

// O segundo item do protótipo dizia "Preço aparece sempre em faixa, até alguém do time
// revisar." — reescrito: o cliente só vê preço depois da aprovação
// (docs/plano-preco-so-apos-aprovacao.md).
const POINTS = [
  "A conversa de diagnóstico é assistida e revisada.",
  "Preço só depois que alguém do time revisa o escopo.",
  "Agentes que a gente entrega passam pra uma pessoa quando não sabem.",
];

/** Home · "Onde a IA entra" — campo de atenção (c1) ao lado do texto. */
export default function AiRole() {
  return (
    <section className={styles.section}>
      <div className={styles.copy}>
        <div className={styles.eyebrow}>Onde a IA entra</div>
        <h2 className={styles.h2}>IA é uma ferramenta do time, não a empresa.</h2>
        <p className={styles.intro}>
          Ela ajuda a organizar o problema, ler documentos e responder rápido. Quem decide o
          escopo, o preço e o que vai pro ar é um engenheiro.
        </p>
        <ul className={styles.points}>
          {POINTS.map((p) => (
            <li key={p}>
              <span className={styles.check} aria-hidden="true">
                ✓
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.frame}>
        <SiteSceneCanvas
          kind="attention"
          label="Campo de atenção: pontos que se organizam em torno do que importa"
        />
      </div>
    </section>
  );
}
