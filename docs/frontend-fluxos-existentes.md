# Fluxos existentes do frontend

Data: 2026-08-28  
Escopo: `devbutter_frontend`, leitura estática do checkout atual.

Este mapa descreve o que o código implementa ou encaminha. Não é prova de execução integrada, PostgreSQL, backend, Socket.IO, Asaas, Sandbox ou produção.

## Visão rápida

| Área | Fluxo observado | Evidência principal |
|---|---|---|
| Público | landing, waitlist e concierge de orçamento | `src/app/(site)/page.tsx`, `src/app/api/waitlist/route.ts`, `src/components/DiagnosisPanel/DiagnosisPanel.tsx` |
| Cotação IA | conversa anônima/autenticada, retomada, preview, gate e draft quote | `src/app/api/portal/conversations/**`, `src/lib/portal/api.ts` |
| Portal | login/signup, password setup, sessão, dashboard, dados, catálogo, projetos e faturas | `src/app/portal/**`, `src/proxy.ts` |
| Pagamentos | Pix/boleto exibidos, método salvo listado/revogado e pagamento encaminhado | `src/app/portal/(dashboard)/faturas/**`, `src/app/api/portal/payment-methods/**` |
| Admin | autenticação, dashboard, clientes, empresas, quotes, pedidos, faturas, IA, conhecimento e webhooks | `src/app/admin/**`, `src/lib/admin/**`, `docs/admin-api-contracts.md` |
| Operação | fallback de manutenção e formulário de espera | `src/app/manutencao/**`, `src/app/api/waitlist/route.ts` |

## Fluxos e controles fortes

### 1. Cotação assistida por IA

1. O modal procura uma conversa retomável em `/api/portal/conversations/current`.
2. Sem conversa, cria uma em `/api/portal/conversations`; o ID fica em cookie `httpOnly`.
3. O cliente conecta ao Socket.IO, entra na conversa e recebe `assistant_chunk`, `assistant_done` ou `assistant_error`.
4. O frontend exibe `draft_preview`, `ready_to_submit` e pendências retornadas pelo backend.
5. No envio, chama `/draft-quote`; tokens retornados podem iniciar sessão e o cookie da conversa é limpo.

Pontos fortes: separação entre conversa e criação do orçamento; backend permanece autoridade para escopo, preço, prazo e prontidão; conversa pode ser anônima; retomada e limpeza de conversa concluída/404 estão previstas.

Pontos de atenção: o Socket.IO é integração direta do navegador (`PUBLIC_SOCKET_URL`), portanto CORS, autenticação da conexão, autorização de `conversation_id`, rate limit, reconexão e observabilidade dependem de validação fora deste checkout. O estado visual é rico, mas não há prova aqui de persistência, entrega ordenada ou idempotência do turno.

### 2. Autenticação e sessão

Portal e admin possuem login próprio no BFF. O `proxy.ts` protege as rotas, verifica expiração heurística e tenta renovar o par de tokens. Tokens ficam em cookies `httpOnly`, `sameSite=lax`, `secure` em produção e com `no-store` nas chamadas de API.

Pontos fortes: tokens não são entregues ao JavaScript da página; chamadas server-side usam `Authorization`; portal e admin têm cookies, fallbacks e contratos separados; password setup mantém endpoint e token próprios.

Falhas/lacunas: refresh concorrente não está coordenado; falhas de upstream são convertidas em redirecionamento/sessão expirada; não há evidência frontend de CSRF, rotação/revogação efetiva no backend, auditoria ou detecção de abuso. O login admin contém o link textual “Esqueci minha senha”, sem fluxo implementado neste checkout.

### 3. Portal e pagamentos

O portal carrega dados server-side. Faturas são filtradas no cliente e exibem Pix/boleto devolvidos pelo serviço. O pagamento com método salvo envia `invoice_id`, `payment_method_id` e `idempotency_key`. O cadastro de cartão usa envelope opaco: o BFF lê o corpo como texto e o encaminha sem parsear ou reserializar.

Pontos fortes: BFF não persiste nem interpreta PAN/CVV; envelope tem validação estrutural; métodos expõem apenas marca, últimos quatro e validade; revogação usa `DELETE`; pagamento e tokenização são endpoints distintos; `cache: no-store` é aplicado.

Falhas/lacunas: não há UI completa/evidência de cadastro de novo cartão neste checkout; o estado de pagamento é aceito e apresentado sem prova de polling/webhook/reconciliação; `crypto.randomUUID()` é gerado no cliente e a unicidade/semântica da idempotência depende do backend; links Pix/boleto abrem dados externos e precisam de validação de expiração/status. Não há evidência de 3DS, chargeback, refund, timeout ou retry seguro.

### 4. Administração

O admin usa `adminFetch` server-side e ações server actions para mutações. O layout carrega conta e fila de revisão; as áreas cobrem operação comercial, clientes, pedidos, faturas, catálogo, conversas IA, knowledge base, Mind, Asaas e webhooks.

Pontos fortes: contratos administrativos estão documentados; separação admin/portal; segredo interno não deve chegar ao navegador; operações mutáveis passam por ações do servidor; webhook possui intenção de listagem/reprocessamento.

Falhas/lacunas: `docs/admin-api-contracts.md` descreve vários endpoints como contratos esperados, não comprova implementação ou integração backend; o botão “Esqueci minha senha” admin não tem ação; não há evidência de RBAC granular, confirmação para ações financeiras, trilha de auditoria, paginação real, retries ou proteção contra dupla submissão.

## Pontos faltantes ou prioritários

1. Prova integrada frontend → backend → Relay/Asaas para login, quote, invoice, método salvo e pagamento.
2. Contrato e validação de autenticação/autorização do Socket.IO e de cada conversa.
3. Fluxo de recuperação de senha do portal/admin, incluindo estados expirado, reutilizado e rate limit.
4. Estados financeiros completos: pending/processing/paid/failed/expired, polling ou atualização por evento, reconciliação e idempotência persistida.
5. Fluxo real de cadastro seguro de cartão, erro de envelope, rotation de chave, 3DS e UX de cancelamento.
6. CSRF, rate limiting, Content-Security-Policy e política de logs/redação verificados em runtime.
7. Testes E2E com serviços reais ou ambientes controlados; os testes atuais de Route Handlers são evidência localizada, não GO operacional.
8. Atualização de `SPEC.md`, `USER_INTERFACE.md` e `USER_EXPERIENCE.md`, inexistentes neste checkout, se forem requisitos formais do projeto.

## Validação desta documentação

Foi feita inspeção estática de rotas, páginas, componentes, serviços, proxy, contratos existentes e histórico. Não foi executado fluxo com backend, banco, Socket.IO ou provedor de pagamentos nesta fatia.

