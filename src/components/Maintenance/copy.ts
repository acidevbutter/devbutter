export type MaintenanceVariant = "reconstrucao" | "construcao";

export type LogRow = {
  marker: string;
  markerClass: string;
  label: string;
  dim?: boolean;
  caret?: boolean;
};

type MaintenanceCopy = {
  /** Shown in the header pill and, in lowercase prose, in the footer. */
  status: string;
  headline: { lead: string; prefix: string; suffix: string };
  intro: string;
  /** Opens the second paragraph in full white — the reassurance the visitor came for. */
  reassurance: string;
  notifyLabel: string;
  log: LogRow[];
  metaTitle: string;
  metaDescription: string;
};

const SUPPORT_LINE =
  "Se você tem um problema operacional para resolver, o ponto de partida é um diagnóstico — não uma tecnologia decidida de antemão.";

const STUDIO_LINE =
  "A DevButter é um estúdio de tecnologia que transforma processos e problemas de operação em software: sites, plataformas, agentes de IA, automações e sistemas sob medida.";

export const MAINTENANCE_COPY: Record<MaintenanceVariant, MaintenanceCopy> = {
  reconstrucao: {
    status: "site em reconstrução",
    headline: { lead: "Nosso site está sendo", prefix: "recons", suffix: "truído" },
    intro: `${STUDIO_LINE} Estamos refazendo esta página inteira para explicar isso com a clareza que o trabalho exige.`,
    reassurance: "Os projetos seguem em andamento e o atendimento continua normal.",
    notifyLabel: "avise quando o novo site entrar no ar",
    log: [
      { marker: "✓", markerClass: "gn", label: "arquitetura e conteúdo definidos" },
      { marker: "✓", markerClass: "gn", label: "identidade visual aplicada" },
      { marker: "▸", markerClass: "pk", label: "cases e experimentos em redação" },
      {
        marker: "·",
        markerClass: "",
        label: "integração do concierge de IA",
        dim: true,
        caret: true,
      },
    ],
    metaTitle: "DevButter — site em reconstrução",
    metaDescription:
      "Estamos refazendo o site da DevButter. Os projetos seguem em andamento e o atendimento continua normal — fale com a gente por contato@devbutter.com.",
  },
  construcao: {
    status: "site em construção",
    headline: { lead: "Nosso site está sendo", prefix: "cons", suffix: "truído" },
    intro: `${STUDIO_LINE} Estamos construindo esta página para explicar isso com a clareza que o trabalho exige.`,
    reassurance: "O estúdio já está atendendo e os projetos seguem em andamento.",
    notifyLabel: "avise quando o site entrar no ar",
    log: [
      { marker: "✓", markerClass: "gn", label: "marca e identidade definidas" },
      { marker: "✓", markerClass: "gn", label: "arquitetura do site fechada" },
      { marker: "▸", markerClass: "pk", label: "páginas e conteúdo em produção" },
      {
        marker: "·",
        markerClass: "",
        label: "integração do concierge de IA",
        dim: true,
        caret: true,
      },
    ],
    metaTitle: "DevButter — site em construção",
    metaDescription:
      "O site da DevButter está sendo construído. O estúdio já está atendendo — fale com a gente por contato@devbutter.com.",
  },
};

export { SUPPORT_LINE };

/** Anything other than an explicit `construcao` keeps the reconstruction copy. */
export function resolveVariant(value: string | undefined): MaintenanceVariant {
  return value === "construcao" ? "construcao" : "reconstrucao";
}
