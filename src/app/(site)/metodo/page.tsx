import type { Metadata } from "next";
import Card, { Label } from "@/components/admin/ui/Card/Card";
import ConciergeCta from "@/components/ConciergeCta/ConciergeCta";
import styles from "./Metodo.module.scss";

export const metadata: Metadata = {
  title: "Como trabalhamos",
  description:
    "Da informação à decisão: dados, modelos, experiência e contexto. O mesmo processo pra um site, uma plataforma ou um agente — com um engenheiro revisando tudo que a IA ajuda a montar.",
  alternates: { canonical: "/metodo" },
  openGraph: { title: "Como trabalhamos · DevButter", url: "/metodo" },
};

const PIPELINE = [
  {
    n: "01",
    title: "Dados",
    body: "O que já existe: planilhas, sistemas, conversas, papel. A gente olha tudo antes de propor qualquer coisa.",
  },
  {
    n: "02",
    title: "Modelos",
    body: "Como o trabalho realmente acontece — quem faz o quê, quando, e onde trava. Às vezes a resposta é uma regra simples, não IA.",
  },
  {
    n: "03",
    title: "Experiência",
    body: "Uma tela, um fluxo ou uma conversa que a sua equipe usa sem treinamento longo.",
  },
  {
    n: "04",
    title: "Contexto → decisão",
    body: "O sistema mostra o que importa na hora certa. A decisão continua sendo de quem conhece o negócio.",
  },
];

// "faixa de preço" saiu do resumo: o preço só chega depois da revisão de um
// engenheiro (docs/plano-preco-so-apos-aprovacao.md).
const DELIVERABLES = [
  {
    label: "diagnóstico",
    title: "Resumo do problema",
    body: "Em linguagem simples, com os caminhos possíveis e o prazo de cada um.",
  },
  {
    label: "proposta",
    title: "Escopo revisado",
    body: "Etapas, prazo e valor fechado, revisados por um engenheiro. Você aprova na sua conta.",
  },
  {
    label: "entregas",
    title: "Progresso à vista",
    body: "Demonstrações a cada etapa e conversa direta com quem está construindo.",
  },
];

export default function MetodoPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroScene} aria-hidden="true" />
        <div className={styles.heroText}>
          <div className={styles.heroEyebrow} data-fx-mask="">
            Como trabalhamos
          </div>
          <h1 className={styles.heroTitle} data-fx-mask="">
            Da informação
            <br />
            <span className={styles.accent}>à decisão.</span>
          </h1>
          <p className={styles.heroLead} data-fx-mask="">
            Muita coisa solta vira uma decisão clara. É o mesmo processo pra um site, uma
            plataforma ou um agente.
          </p>
        </div>
        <div className={styles.heroSpacer} aria-hidden="true" />
      </section>

      <section className={styles.section} aria-labelledby="metodo-etapas">
        <h2 id="metodo-etapas" className="sr-only">
          As quatro etapas
        </h2>
        <ol className={styles.pipeline}>
          {PIPELINE.map((step) => (
            <li key={step.n} className={styles.pipelineRow}>
              <span className={styles.pipelineNum}>{step.n}</span>
              <span className={styles.pipelineTitle}>{step.title}</span>
              <span className={styles.pipelineBody}>{step.body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${styles.section} ${styles.split}`}>
        <div className={styles.sceneFrame} aria-hidden="true" />
        <div className={styles.splitText}>
          <div className={styles.eyebrowPink}>Por dentro</div>
          <h2 className={styles.h2}>Como um modelo aprende — e por que alguém confere.</h2>
          <p className={styles.intro}>
            Verde é o sinal indo; rosa é a correção voltando. Um modelo erra e se ajusta. Por
            isso, em tudo que a gente entrega com IA, existe um ponto em que uma pessoa revisa.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.eyebrow}>O que você recebe</div>
        <div className={styles.deliverables}>
          {DELIVERABLES.map((d) => (
            <Card key={d.label} className={styles.deliverable}>
              <Label>{d.label}</Label>
              <div className={styles.cardTitle}>{d.title}</div>
              <p className={styles.cardBody}>{d.body}</p>
            </Card>
          ))}
        </div>
        <ConciergeCta className={styles.cta}>Começar pelo diagnóstico</ConciergeCta>
      </section>
    </>
  );
}
