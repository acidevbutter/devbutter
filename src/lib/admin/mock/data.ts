import "server-only";
import type {
  AdminCatalogEntry,
  AdminClientDetail,
  AdminClientListItem,
  AdminConversationDetail,
  AdminConversationListItem,
  AdminDashboardMetrics,
  AdminInvoiceListItem,
  AdminOrderListItem,
  AdminWebhookEvent,
  KnowledgeEntry,
  QuoteRead,
} from "../types";

// In-memory mock store for every domain docs/admin-api-contracts.md proposes.
// Seeded with the exact sample values from the Claude Design mockup so the
// screens render identically to the design out of the box. Resets on every
// server restart — that's fine, it's a stand-in for a real backend table.
// Mock ids are prefixed "mock-" so real-domain pages (orders, quotes) can
// tell a mock id apart from a real backend UUID and route accordingly.

export const mockClients: AdminClientListItem[] = [
  {
    id: "mock-client-atelie-corvo",
    name: "Ateliê Corvo",
    business_name: "Ateliê Corvo Ltda",
    email: "contato@ateliecorvo.com",
    document: "12.345.678/0001-90",
    created_at: "2025-03-14T00:00:00Z",
    asaas_customer_id: "cus_000912345",
    quotes_count: 3,
    orders_count: 1,
  },
  {
    id: "mock-client-grupo-mendes",
    name: "Grupo Mendes",
    business_name: "Grupo Mendes Participações",
    email: "contato@grupomendes.com.br",
    document: "23.456.789/0001-11",
    created_at: "2025-05-02T00:00:00Z",
    asaas_customer_id: "cus_000912777",
    quotes_count: 1,
    orders_count: 1,
  },
  {
    id: "mock-client-clinica-vitta",
    name: "Clínica Vitta",
    business_name: "Clínica Vitta Saúde Integrada",
    email: "adm@clinicavitta.com.br",
    document: "34.567.890/0001-22",
    created_at: "2026-08-20T00:00:00Z",
    asaas_customer_id: null,
    quotes_count: 0,
    orders_count: 0,
  },
  {
    id: "mock-client-studio-nove",
    name: "Studio Nove",
    business_name: "Studio Nove Produções",
    email: "financeiro@studionove.com",
    document: "45.678.901/0001-33",
    created_at: "2025-01-10T00:00:00Z",
    asaas_customer_id: "cus_000909999",
    quotes_count: 1,
    orders_count: 1,
  },
  {
    id: "mock-client-padaria-lume",
    name: "Padaria Lume",
    business_name: null,
    email: "oi@padarialume.com.br",
    document: "56.789.012/0001-44",
    created_at: "2025-06-20T00:00:00Z",
    asaas_customer_id: "cus_000905544",
    quotes_count: 1,
    orders_count: 1,
  },
  {
    id: "mock-client-rede-alvo",
    name: "Rede Alvo",
    business_name: "Rede Alvo Varejo S.A.",
    email: "ti@redealvo.com",
    document: "67.890.123/0001-55",
    created_at: "2025-02-01T00:00:00Z",
    asaas_customer_id: null,
    quotes_count: 1,
    orders_count: 0,
  },
];

// Non-draft quotes only — GET /admin/quotes (real) already covers the draft
// review queue, so the Quotes List screen merges these in for the other
// status filters (approved/edited/rejected) the mockup shows.
export const mockNonDraftQuotes: QuoteRead[] = [
  {
    id: "mock-quote-q118",
    account_id: "mock-client-atelie-corvo",
    conversation_id: "mock-conversation-1",
    source: "ai",
    status: "approved",
    scope_summary: "Loja com catálogo próprio e agente de atendimento no WhatsApp",
    price_range: "18–24k",
    timeline: "8 semanas",
    reviewed_by: "mock-admin",
    reviewed_at: "2026-08-20T09:40:00Z",
    created_at: "2026-08-20T09:02:00Z",
  },
  {
    id: "mock-quote-q117",
    account_id: "mock-client-grupo-mendes",
    conversation_id: "mock-conversation-3",
    source: "ai",
    status: "approved",
    scope_summary: "Automação de leads dentro do CRM",
    price_range: "9–12k",
    timeline: "4 semanas",
    reviewed_by: "mock-admin",
    reviewed_at: "2026-07-28T10:00:00Z",
    created_at: "2026-07-27T08:00:00Z",
  },
  {
    id: "mock-quote-q104",
    account_id: "mock-client-atelie-corvo",
    conversation_id: null,
    source: "manual",
    status: "approved",
    scope_summary: "Catálogo fase 1",
    price_range: "9–11k",
    timeline: "5 semanas",
    reviewed_by: "mock-admin",
    reviewed_at: "2025-06-20T14:00:00Z",
    created_at: "2025-06-15T09:00:00Z",
  },
  {
    id: "mock-quote-q071",
    account_id: "mock-client-atelie-corvo",
    conversation_id: null,
    source: "manual",
    status: "rejected",
    scope_summary: "Landing de lançamento",
    price_range: "4–6k",
    timeline: null,
    reviewed_by: "mock-admin",
    reviewed_at: "2025-03-10T14:00:00Z",
    created_at: "2025-03-05T09:00:00Z",
  },
  {
    id: "mock-quote-q112",
    account_id: "mock-client-studio-nove",
    conversation_id: null,
    source: "manual",
    status: "approved",
    scope_summary: "Plataforma interna de operação",
    price_range: "32–40k",
    timeline: "12 semanas",
    reviewed_by: "mock-admin",
    reviewed_at: "2025-08-14T14:00:00Z",
    created_at: "2025-08-10T09:00:00Z",
  },
  {
    id: "mock-quote-q108",
    account_id: "mock-client-padaria-lume",
    conversation_id: "mock-conversation-3",
    source: "ai",
    status: "edited",
    scope_summary: "Landing + checkout simples",
    price_range: "6–8k",
    timeline: "3 semanas",
    reviewed_by: "mock-admin",
    reviewed_at: "2025-08-11T11:00:00Z",
    created_at: "2025-08-09T08:00:00Z",
  },
  {
    id: "mock-quote-q095",
    account_id: "mock-client-rede-alvo",
    conversation_id: "mock-conversation-4",
    source: "ai",
    status: "rejected",
    scope_summary: "Agente de suporte nível 1",
    price_range: null,
    timeline: null,
    reviewed_by: "mock-admin",
    reviewed_at: "2025-08-02T10:00:00Z",
    created_at: "2025-08-01T08:00:00Z",
  },
];

export const mockOrders: AdminOrderListItem[] = [
  {
    id: "mock-order-1043",
    quote_id: "mock-quote-q118",
    account_id: "mock-client-atelie-corvo",
    account_name: "Ateliê Corvo",
    status: "created",
    amount: "21000",
    created_at: "2026-08-20T09:40:00Z",
  },
  {
    id: "mock-order-1042",
    quote_id: "mock-quote-q112",
    account_id: "mock-client-studio-nove",
    account_name: "Studio Nove",
    status: "invoiced",
    amount: "12000",
    created_at: "2026-08-05T12:00:00Z",
  },
  {
    id: "mock-order-1039",
    quote_id: "mock-quote-q117",
    account_id: "mock-client-grupo-mendes",
    account_name: "Grupo Mendes",
    status: "completed",
    amount: "10500",
    created_at: "2026-07-28T10:00:00Z",
  },
  {
    id: "mock-order-1031",
    quote_id: "mock-quote-q108",
    account_id: "mock-client-padaria-lume",
    account_name: "Padaria Lume",
    status: "cancelled",
    amount: "3000",
    created_at: "2026-07-15T10:00:00Z",
  },
];

export const mockOrderDetailExtras: Record<
  string,
  {
    scope_summary: string;
    deliverables: string[];
    timeline: string;
    quote_label: string;
  }
> = {
  "mock-order-1043": {
    scope_summary:
      "Loja com catálogo próprio e agente de atendimento treinado no acervo, integrado ao WhatsApp.",
    deliverables: [
      "Design e front da loja · 11 telas",
      "Agente RAG + integração WhatsApp",
      "Painel de pedidos e estoque leve",
    ],
    timeline: "8 semanas",
    quote_label: "Q-118",
  },
  "mock-order-1042": {
    scope_summary: "Plataforma interna de operação sob medida.",
    deliverables: ["Levantamento de processos", "Plataforma web", "Treinamento da equipe"],
    timeline: "12 semanas",
    quote_label: "Q-112",
  },
  "mock-order-1039": {
    scope_summary: "Automação de leads dentro do CRM existente.",
    deliverables: ["Integração com CRM", "Fluxos de automação"],
    timeline: "4 semanas",
    quote_label: "Q-117",
  },
  "mock-order-1031": {
    scope_summary: "Landing + checkout simples.",
    deliverables: ["Landing page", "Checkout"],
    timeline: "3 semanas",
    quote_label: "Q-108",
  },
};

export const mockInvoices: AdminInvoiceListItem[] = [
  {
    id: "mock-invoice-1043-1",
    order_id: "mock-order-1043",
    account_name: "Ateliê Corvo",
    asaas_invoice_id: "inv_1043a",
    amount: "10500",
    currency: "BRL",
    status: "RECEIVED",
    due_date: "2026-08-05",
    payment_link: "https://asaas.com/i/mock-1043a",
  },
  {
    id: "mock-invoice-1043-2",
    order_id: "mock-order-1043",
    account_name: "Ateliê Corvo",
    asaas_invoice_id: "inv_1043b",
    amount: "10500",
    currency: "BRL",
    status: "PENDING",
    due_date: "2026-09-30",
    payment_link: "https://asaas.com/i/mock-1043b",
  },
  {
    id: "mock-invoice-1042",
    order_id: "mock-order-1042",
    account_name: "Studio Nove",
    asaas_invoice_id: "inv_1042",
    amount: "12000",
    currency: "BRL",
    status: "OVERDUE",
    due_date: "2026-08-10",
    payment_link: "https://asaas.com/i/mock-1042",
  },
  {
    id: "mock-invoice-1039",
    order_id: "mock-order-1039",
    account_name: "Grupo Mendes",
    asaas_invoice_id: "inv_1039",
    amount: "10500",
    currency: "BRL",
    status: "RECEIVED",
    due_date: "2026-08-02",
    payment_link: null,
  },
  {
    id: "mock-invoice-1031",
    order_id: "mock-order-1031",
    account_name: "Padaria Lume",
    asaas_invoice_id: "inv_1031",
    amount: "3000",
    currency: "BRL",
    status: "REFUNDED",
    due_date: "2026-07-28",
    payment_link: null,
  },
];

export const mockDashboard: AdminDashboardMetrics = {
  active_orders: 7,
  receivable_open_amount: "48000",
  overdue_amount: "12000",
  overdue_invoice_count: 1,
  overdue_client_name: "Studio Nove",
  recent_activity: [
    { kind: "invoice_paid", message: "invoice #2201 paga · R$ 6.000", at: "2026-08-21T10:20:00Z" },
    {
      kind: "quote_approved",
      message: "quote Q-116 aprovado → order #1042",
      at: "2026-08-21T09:40:00Z",
    },
    { kind: "client_created", message: "novo cliente: Clínica Vitta", at: "2026-08-20T09:00:00Z" },
    { kind: "webhook_processed", message: "webhook Asaas processado", at: "2026-08-20T08:00:00Z" },
  ],
};

export const mockKnowledgeEntries: KnowledgeEntry[] = [
  {
    id: "mock-kb-website",
    name: "Website institucional",
    description:
      "Site de até 8 seções, design autoral, CMS leve. Não inclui loja nem integrações com ERP.",
    price_min: "6000",
    price_max: "14000",
    typical_duration: "4 semanas",
    ai_instructions:
      'Se o cliente pedir e-commerce ou integrações, escalar para "Plataforma sob medida". Nunca prometer prazo abaixo de 3 semanas.',
    updated_at: "2026-08-12T00:00:00Z",
  },
  {
    id: "mock-kb-agente-ia",
    name: "Agente de IA (atendimento)",
    description: "Agente treinado no acervo/base de conhecimento do cliente, com handoff humano.",
    price_min: "12000",
    price_max: "28000",
    typical_duration: "8 semanas",
    ai_instructions: "Sempre perguntar volume de mensagens/semana antes de estimar a faixa.",
    updated_at: "2026-07-30T00:00:00Z",
  },
  {
    id: "mock-kb-automacao-leads",
    name: "Automação de leads",
    description: "Automação de captura e distribuição de leads integrada ao CRM do cliente.",
    price_min: "8000",
    price_max: "15000",
    typical_duration: "4 semanas",
    ai_instructions: "Confirmar qual CRM está em uso antes de comprometer prazo.",
    updated_at: "2026-07-18T00:00:00Z",
  },
  {
    id: "mock-kb-plataforma-medida",
    name: "Plataforma sob medida",
    description: "Software interno sob medida — o degrau acima de website/automação pontual.",
    price_min: "30000",
    price_max: "80000",
    typical_duration: "12 semanas",
    ai_instructions: "Nunca fechar faixa sem uma call de levantamento de escopo.",
    updated_at: "2026-06-25T00:00:00Z",
  },
];

export const mockConversations: AdminConversationDetail[] = [
  {
    id: "mock-conversation-1",
    account_id: "mock-client-atelie-corvo",
    account_name: "Ateliê Corvo",
    message_count: 14,
    resulting_quote_id: "mock-quote-q118",
    started_at: "2026-08-20T13:00:00Z",
    messages: [
      { role: "assistant", content: "Me conta o que você vende e como atende hoje.", at: "2026-08-20T13:00:00Z" },
      {
        role: "visitor",
        content: "Peças de couro autorais. Vendo no Instagram e respondo tudo no WhatsApp.",
        at: "2026-08-20T13:01:00Z",
      },
      {
        role: "assistant",
        content: "Quantos pedidos por semana, e quem responde as mensagens?",
        at: "2026-08-20T13:02:00Z",
      },
      { role: "visitor", content: "Uns 25 por semana, e sou só eu.", at: "2026-08-20T13:03:00Z" },
    ],
    draft: {
      scope_summary: "loja + agente no WhatsApp",
      price_range: "R$ 18.000 – 24.000",
      timeline: "8 semanas",
    },
  },
  {
    id: "mock-conversation-2",
    account_id: null,
    account_name: "visitante anônimo",
    message_count: 6,
    resulting_quote_id: null,
    started_at: "2026-08-19T15:00:00Z",
    messages: [
      { role: "assistant", content: "Me conta o que você vende e como atende hoje.", at: "2026-08-19T15:00:00Z" },
      { role: "visitor", content: "Só pesquisando por enquanto, valeu.", at: "2026-08-19T15:01:00Z" },
    ],
    draft: null,
  },
  {
    id: "mock-conversation-3",
    account_id: "mock-client-grupo-mendes",
    account_name: "Grupo Mendes",
    message_count: 21,
    resulting_quote_id: "mock-quote-q117",
    started_at: "2026-08-18T10:00:00Z",
    messages: [
      { role: "assistant", content: "Como funciona a captação de leads hoje?", at: "2026-08-18T10:00:00Z" },
      { role: "visitor", content: "Tudo manual, direto no CRM.", at: "2026-08-18T10:02:00Z" },
    ],
    draft: {
      scope_summary: "automação de leads dentro do CRM",
      price_range: "R$ 9.000 – 12.000",
      timeline: "4 semanas",
    },
  },
];

export const mockConversationList: AdminConversationListItem[] = mockConversations.map(
  ({ id, account_id, account_name, message_count, resulting_quote_id, started_at }) => ({
    id,
    account_id,
    account_name,
    message_count,
    resulting_quote_id,
    started_at,
  })
);

export const mockCatalogEntries: AdminCatalogEntry[] = [
  {
    id: "mock-catalog-1",
    account_id: "mock-client-atelie-corvo",
    account_name: "Ateliê Corvo",
    type: "Loja com catálogo",
    description: "Front da loja + agente de atendimento no WhatsApp.",
    created_at: "2026-08-20T09:00:00Z",
  },
  {
    id: "mock-catalog-2",
    account_id: "mock-client-atelie-corvo",
    account_name: "Ateliê Corvo",
    type: "Painel de estoque",
    description: "Painel leve de pedidos e estoque.",
    created_at: "2026-08-20T09:00:00Z",
  },
  {
    id: "mock-catalog-3",
    account_id: "mock-client-studio-nove",
    account_name: "Studio Nove",
    type: "Plataforma interna",
    description: "Operação de produção ponta a ponta.",
    created_at: "2025-08-10T09:00:00Z",
  },
];

export const mockWebhookEvents: AdminWebhookEvent[] = [
  {
    id: "mock-webhook-1",
    event_type: "PAYMENT_RECEIVED",
    related_invoice_id: "mock-invoice-2201",
    related_label: "inv #2201",
    processed_ok: true,
    error_message: null,
    payload: { event: "PAYMENT_RECEIVED", payment: { id: "pay_88201", value: 6000 } },
    received_at: "2026-08-21T10:02:00Z",
  },
  {
    id: "mock-webhook-2",
    event_type: "PAYMENT_OVERDUE",
    related_invoice_id: "mock-invoice-2188",
    related_label: "inv #2188",
    processed_ok: true,
    error_message: null,
    payload: { event: "PAYMENT_OVERDUE", payment: { id: "pay_88188", value: 12000 } },
    received_at: "2026-08-21T03:00:00Z",
  },
  {
    id: "mock-webhook-3",
    event_type: "PAYMENT_REFUNDED",
    related_invoice_id: "mock-invoice-2141",
    related_label: "inv #2141",
    processed_ok: false,
    error_message: "invoice local não encontrada",
    payload: { event: "PAYMENT_REFUNDED", payment: { id: "pay_88213", value: 3000 } },
    received_at: "2026-08-20T18:44:00Z",
  },
  {
    id: "mock-webhook-4",
    event_type: "CHARGEBACK",
    related_invoice_id: "mock-invoice-2098",
    related_label: "inv #2098",
    processed_ok: false,
    error_message: "assinatura do webhook inválida",
    payload: { event: "CHARGEBACK", payment: { id: "pay_88098", value: 4500 } },
    received_at: "2026-08-14T09:12:00Z",
  },
];

// Counts derived from the arrays above (not hand-typed) so a client's tab
// badges always match what its tabs actually render.
export const mockClientDetails: Record<string, AdminClientDetail> = Object.fromEntries(
  mockClients.map((c) => {
    const orders = mockOrders.filter((o) => o.account_id === c.id);
    const orderIds = new Set(orders.map((o) => o.id));
    return [
      c.id,
      {
        ...c,
        phone: "+55 11 90000-0000",
        asaas_status: c.asaas_customer_id ? ("vinculado" as const) : ("nao_vinculado" as const),
        counts: {
          quotes: mockNonDraftQuotes.filter((q) => q.account_id === c.id).length,
          orders: orders.length,
          invoices: mockInvoices.filter((i) => orderIds.has(i.order_id)).length,
          catalog_entries: mockCatalogEntries.filter((e) => e.account_id === c.id).length,
          conversations: mockConversationList.filter((cv) => cv.account_id === c.id).length,
        },
      },
    ];
  })
);
