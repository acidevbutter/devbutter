// Cases do site — fonte única para a home (trilho), /cases (grade + filtro) e
// /cases/[slug] (detalhe). Copiado 1:1 do array CASES de
// docs/design/Site DevButter.dc.html. Nomes de empresas trocados a pedido dos
// clientes; problema e resultado são reais — não inventar cases aqui.

export const SECTORS = [
  { slug: "varejo", label: "varejo" },
  { slug: "saude", label: "saúde" },
  { slug: "logistica", label: "logística" },
  { slug: "educacao", label: "educação" },
  { slug: "servicos", label: "serviços" },
] as const;

export type SectorSlug = (typeof SECTORS)[number]["slug"];

/** Filtro da página /cases: "todos" ou um setor. Vai na URL como `?setor=`. */
export type SectorFilter = "todos" | SectorSlug;

export type CaseStudy = {
  /** Slug da URL (/cases/[slug]). */
  id: string;
  title: string;
  sector: SectorSlug;
  duration: string;
  tags: string[];
  headline: string;
  before: string;
  after: string;
  problem: string;
  built: string;
  result: string;
};

export const CASES: readonly CaseStudy[] = [
  {
    id: "padaria-norte",
    title: "Padaria Norte",
    sector: "varejo",
    duration: "9 semanas",
    tags: ["Plataforma", "Automação"],
    headline: "Pedido do balcão chega no estoque sozinho.",
    before: "Três planilhas, um caderno no balcão e o fechamento levando dois dias toda semana.",
    after: "Pedido, estoque e caixa no mesmo lugar. O fechamento sai todo dia, sem ninguém redigitar.",
    problem:
      "A equipe anotava pedidos no caderno, passava pra planilha à noite e conferia o caixa no fim de semana. Faltava insumo toda segunda e ninguém sabia dizer por quê.",
    built:
      "Uma plataforma simples de pedidos e estoque, ligada ao caixa que eles já usavam. O balcão registra no tablet; a baixa no estoque é automática.",
    result:
      "A compra de insumos passou a ser feita com base no que realmente saiu. A dona deixou de fechar o caixa no domingo.",
  },
  {
    id: "clinica-vale",
    title: "Clínica Vale",
    sector: "saude",
    duration: "6 semanas",
    tags: ["Agente", "WhatsApp"],
    headline: "Confirmação de consulta sem ligação.",
    before: "Duas recepcionistas passavam a manhã ligando pra confirmar consultas do dia seguinte.",
    after: "Um agente confirma, remarca e tira dúvidas pelo WhatsApp — e chama a recepção quando precisa.",
    problem:
      "As faltas deixavam buracos na agenda e a recepção não dava conta de ligar pra todo mundo e ainda atender quem chegava.",
    built:
      "Um agente no WhatsApp treinado com as regras da clínica, ligado à agenda. Ele confirma, oferece novos horários e passa a conversa pra uma pessoa em casos sensíveis.",
    result:
      "A recepção voltou a atender quem está na clínica. Os horários vagos passaram a ser preenchidos no mesmo dia.",
  },
  {
    id: "distribuidora-ipe",
    title: "Distribuidora Ipê",
    sector: "logistica",
    duration: "5 semanas",
    tags: ["Integração"],
    headline: "Frete cotado em segundos.",
    before: "Cada cotação de frete exigia abrir quatro sites de transportadora e montar uma planilha.",
    after: "O vendedor digita o CEP e o peso e recebe as opções lado a lado, já com a margem.",
    problem:
      "Os vendedores perdiam negócio enquanto cotavam frete, e cada um calculava a margem de um jeito.",
    built:
      "Uma integração com as transportadoras que eles já usavam, dentro do sistema de pedidos, com a regra de margem definida pela diretoria.",
    result:
      "A cotação virou parte do atendimento, não uma tarefa à parte. A margem passou a seguir uma regra só.",
  },
  {
    id: "escola-aurora",
    title: "Escola Aurora",
    sector: "educacao",
    duration: "8 semanas",
    tags: ["Site", "Plataforma"],
    headline: "Matrícula online, sem papel.",
    before: "Fila na secretaria em janeiro e pastas de documentos que se perdiam entre salas.",
    after: "Pais fazem a matrícula pelo site, enviam documentos e acompanham o status.",
    problem: "O período de matrícula travava a secretaria por semanas e documentos sumiam.",
    built:
      "Um site novo com fluxo de matrícula e um painel pra secretaria aprovar documentos e conversar com as famílias.",
    result:
      "A secretaria atravessou o período de matrícula sem fila. Os documentos ficam num lugar só.",
  },
  {
    id: "oficina-sul",
    title: "Oficina Sul",
    sector: "servicos",
    duration: "4 semanas",
    tags: ["Automação", "Agente"],
    headline: "Orçamento com foto, direto do pátio.",
    before: "O mecânico anotava no papel, o escritório digitava e o cliente esperava horas pelo orçamento.",
    after: "O orçamento sai do pátio com fotos e o cliente aprova pelo celular.",
    problem:
      "Entre o diagnóstico do carro e a aprovação do cliente passavam horas, e o carro ocupava vaga.",
    built:
      "Um formulário no celular do mecânico que monta o orçamento com fotos e envia ao cliente, com aprovação em um toque.",
    result: "Aprovações passaram a acontecer no mesmo turno. O pátio gira mais rápido.",
  },
];

/** Os quatro primeiros aparecem no trilho da home (como no protótipo). */
export const HOME_CASES = CASES.slice(0, 4);

const SECTOR_LABELS: Record<SectorSlug, string> = Object.fromEntries(
  SECTORS.map((s) => [s.slug, s.label])
) as Record<SectorSlug, string>;

export function sectorLabel(sector: SectorSlug): string {
  return SECTOR_LABELS[sector];
}

export function getCase(slug: string): CaseStudy | undefined {
  return CASES.find((c) => c.id === slug);
}

/** Lê `?setor=` com tolerância: valor desconhecido ou ausente vira "todos". */
export function parseSectorFilter(value: string | string[] | null | undefined): SectorFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return SECTORS.some((s) => s.slug === raw) ? (raw as SectorSlug) : "todos";
}

export function filterCases(filter: SectorFilter, list: readonly CaseStudy[] = CASES): CaseStudy[] {
  return filter === "todos" ? [...list] : list.filter((c) => c.sector === filter);
}
