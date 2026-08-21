import "server-only";
import type { PortalAccount, PortalCatalogEntry, PortalInvoice, PortalProject, PortalQuote } from "../types";

// In-memory mock store for the client portal — seeded from the sample values
// in the Claude Design mockup ("Client Portal Wireframes.dc.html") so every
// screen renders with the same numbers the wireframe shows. Resets on every
// server restart. See src/lib/portal/config.ts for why this is mocked
// instead of hitting devbutter_backend.

export const mockAccount: PortalAccount = {
  name: "Ana Corvo",
  email: "ana@atelie-corvo.com",
  businessName: "Ateliê Corvo Ltda.",
  document: "12.345.678/0001-90",
  phone: "(11) 9 9999-0000",
  address: "Rua das Palmeiras, 210 — São Paulo, SP · 01234-000",
};

export const mockProjects: PortalProject[] = [
  {
    id: "loja-atendimento",
    title: "Loja online + atendimento automatizado",
    status: "created",
    statusLabel: "Em desenvolvimento",
    progressPct: 62,
    steps: [
      { label: "Orçamento aprovado", done: true, current: false },
      { label: "Pagamento confirmado", done: true, current: false },
      { label: "Em desenvolvimento", done: false, current: true },
      { label: "Entrega", done: false, current: false },
    ],
    startDate: "2026-08-04",
    dueDate: "2026-09-30",
    scopeItems: [
      "Loja online com catálogo, carrinho e checkout (Pix e cartão)",
      "Atendimento automático no WhatsApp para dúvidas e status de pedido",
      "Painel para você cadastrar produtos e acompanhar pedidos",
      "Treinamento de 1h com a sua equipe na entrega",
    ],
    quoteId: "q-loja-atendimento",
    latestUpdate: {
      message:
        "Estamos finalizando o checkout e a integração de pagamento. Na próxima semana você recebe um link para testar a loja antes da entrega.",
      at: "2026-08-20T00:00:00Z",
    },
  },
  {
    id: "painel-vendas",
    title: "Painel de vendas (BI)",
    status: "invoiced",
    statusLabel: "Aguardando pagamento",
    progressPct: 22,
    steps: [
      { label: "Orçamento aprovado", done: true, current: false },
      { label: "Pagamento confirmado", done: false, current: true },
      { label: "Em desenvolvimento", done: false, current: false },
      { label: "Entrega", done: false, current: false },
    ],
    startDate: "2026-07-21",
    dueDate: "2026-10-15",
    scopeItems: [
      "Painel com métricas de vendas por canal",
      "Alertas automáticos de queda de faturamento",
    ],
    quoteId: "q-painel-vendas",
    latestUpdate: null,
  },
];

export const mockQuotes: PortalQuote[] = [
  {
    id: "q-automacao-whatsapp",
    status: "draft",
    title: "Automação de pedidos no WhatsApp",
    description: "Atendimento automático que recebe pedidos e envia para o seu painel.",
    priceRange: "R$ 9–12 mil",
    timeline: null,
    createdAt: "2026-08-19T00:00:00Z",
    projectId: null,
  },
  {
    id: "q-loja-atendimento",
    status: "approved",
    title: "Loja online + atendimento automatizado",
    description: "Loja com checkout, atendimento no WhatsApp e painel de pedidos.",
    priceRange: "R$ 18 mil",
    timeline: "8 semanas",
    createdAt: "2026-08-02T00:00:00Z",
    projectId: "loja-atendimento",
  },
  {
    id: "q-painel-vendas",
    status: "approved",
    title: "Painel de vendas (BI)",
    description: null as unknown as string,
    priceRange: "R$ 9 mil",
    timeline: "4 semanas",
    createdAt: "2026-07-21T00:00:00Z",
    projectId: "painel-vendas",
  },
  {
    id: "q-app-fidelidade",
    status: "rejected",
    title: "App de fidelidade",
    description: "seguimos disponíveis se quiser retomar",
    priceRange: null,
    timeline: null,
    createdAt: "2026-06-02T00:00:00Z",
    projectId: null,
  },
];

export const mockInvoices: PortalInvoice[] = [
  {
    id: "inv-loja-1",
    projectId: "loja-atendimento",
    projectTitle: "Loja online + atendimento",
    installmentLabel: "1ª de 3",
    amount: "6000",
    dueDate: "2026-08-05",
    status: "RECEIVED",
    pixCode: null,
    boletoUrl: null,
  },
  {
    id: "inv-loja-2",
    projectId: "loja-atendimento",
    projectTitle: "Loja online + atendimento",
    installmentLabel: "2ª de 3",
    amount: "6000",
    dueDate: "2026-08-15",
    status: "OVERDUE",
    pixCode: "00020126580014br.gov.bcb.pix0136mock-pix-code-devbutter-520400005303986540600",
    boletoUrl: "https://sandbox.asaas.com/boleto/mock-loja-2.pdf",
  },
  {
    id: "inv-loja-3",
    projectId: "loja-atendimento",
    projectTitle: "Loja online + atendimento",
    installmentLabel: "3ª de 3",
    amount: "6000",
    dueDate: "2026-09-30",
    status: "PENDING",
    pixCode: null,
    boletoUrl: null,
  },
  {
    id: "inv-painel-1",
    projectId: "painel-vendas",
    projectTitle: "Painel de vendas (BI)",
    installmentLabel: "1ª de 2",
    amount: "4500",
    dueDate: "2026-08-28",
    status: "PENDING",
    pixCode: "00020126580014br.gov.bcb.pix0136mock-pix-code-devbutter-painel520400005303986540600",
    boletoUrl: "https://sandbox.asaas.com/boleto/mock-painel-1.pdf",
  },
];

export const mockCatalogEntries: PortalCatalogEntry[] = [
  { id: "cat-1", type: "Produto", description: "Bolsas de couro sob medida" },
  { id: "cat-2", type: "Produto", description: "Cintos e acessórios em metal" },
  { id: "cat-3", type: "Serviço", description: "Consertos e ajustes em peças de couro" },
];
