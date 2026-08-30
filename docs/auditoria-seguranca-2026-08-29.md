# Auditoria de segurança — pagamentos e BFF (2026-08-29)

Data: 2026-08-29
Escopo: `devbutter_frontend`, leitura estática dos commits recentes de
tokenização de pagamento (`add payment method bff routes`,
`add opaque payment method request boundary`, `feature: add secure payload
helper`, `add Docker development workflow`) e varredura geral de segredos,
`NEXT_PUBLIC_`, CSRF e XSS. Não foi executado fluxo integrado com
devbutter_backend/asaas_payment.

## Achados por severidade

### 1. [ALTA] API key da Asaas vai para o client via RSC/flight payload

- **Onde:** `src/app/admin/(dashboard)/config/asaas/page.tsx:52-53` chama
  `listAccessTokens(activeSub)` (`src/lib/admin/services/asaas.ts:49-53`,
  passthrough real do backend: `GET /admin/subaccounts/{id}/access-tokens`) e
  passa `tabData` (contendo `AsaasAccessToken[]`) inteiro como prop para
  `<AsaasConfigClient ... data={tabData} />` (linha 66-73).
- `AsaasAccessToken.apiKey?: string` (`src/lib/admin/asaas-types.ts:28-33`) é
  o campo com a chave crua.
- `AsaasConfigClient.tsx:1` é `"use client"`; a única "proteção" é
  `maskTail(t.apiKey ?? t.id, 6)` (linha 329), que só trunca a string **na
  hora de renderizar**.
- **Problema:** em Next.js App Router, props de Server Component para Client
  Component são serializadas no payload RSC/flight enviado ao navegador. O
  `apiKey` completo chega ao browser independente do que a UI mostra — é
  visível via "view source", aba de rede ou React DevTools, mesmo que a tela
  só mostre `••••ab12cd`.
- **Impacto:** vazamento de credencial de API do Asaas (provedor de
  pagamento) para qualquer usuário com acesso à tela `/admin/config/asaas`
  (ou a quem intercepte a resposta), inclusive quem não deveria ver a chave
  em texto puro.

### 2. [MÉDIA] `.env.example` documenta porta errada para `API_BASE_URL`

- **Onde:** `.env.example` define `API_BASE_URL=http://localhost:8002` e
  comenta "Padrão local: uvicorn rodando em devbutter_backend na porta
  8002".
- `src/lib/portal/config.ts:3` usa fallback
  `process.env.API_BASE_URL ?? "http://localhost:8000"`, e todos os testes
  das rotas BFF de pagamento (`src/app/api/portal/payment-methods/**/*.test.ts`)
  esperam `http://localhost:8000` como URL de destino.
- O `.env` versionado localmente neste checkout ainda tem o comentário
  "porta 8000" ao lado do valor `8002`, reforçando a inconsistência.
- **Impacto:** não é uma falha de segurança, mas gera ambiente de
  desenvolvimento quebrado para quem segue o `.env.example` literalmente —
  o BFF aponta para uma porta onde o backend real (segundo o código/testes)
  não está.

### 3. [BAIXA / OPCIONAL] Ausência de token CSRF nas rotas BFF de pagamento

- **Onde:** `src/lib/portal/api.ts:33-50` (`portalFetch`) autentica só pelo
  cookie `db_portal_at`; as rotas `payment-methods/pay`,
  `payment-methods/secure` e `payment-methods/[id]` (DELETE) não verificam
  nenhum token CSRF, apenas a presença do cookie.
- **Mitigação já existente:** o cookie é `httpOnly`, `sameSite: "lax"`,
  `secure` em produção (`src/lib/portal/session.ts:17-24`,
  `src/proxy.ts:19-24`) — isso já bloqueia a maioria dos vetores clássicos
  de CSRF cross-site para POST/DELETE.
- **Impacto:** risco residual baixo hoje; vira relevante apenas se
  `sameSite` for relaxado no futuro, se surgir um subdomínio comprometido
  no mesmo site, ou se o time quiser defesa em profundidade. Tratado aqui
  como nota, não como correção obrigatória (ver seção de prompts).

## Pontos positivos (para não perder o que já está certo)

- `src/lib/secure-payload.ts` implementa o envelope opaco com AES-GCM
  (`crypto.subtle.encrypt`, tag de 128 bits), AAD canônica incluindo
  `contextId`, `kid`, `method`, `path`, `purpose`, `requestId` e `ts`, e
  validação estrita de formato (`validateEnvelope`) — nunca manipula PAN/CVV
  em texto puro.
- `src/app/api/portal/payment-methods/secure/route.ts` lê o corpo com
  `request.text()` e o encaminha **byte a byte** ao backend, sem
  `JSON.parse`/`JSON.stringify` — comentário no código explica que
  re-serializar quebraria a integridade do envelope; o BFF nunca inspeciona,
  loga ou transforma esse corpo.
- Todas as rotas BFF de pagamento exigem o cookie de sessão do portal antes
  de proxyar para o backend — comprovado pelos testes
  `payment-methods/*.test.ts` ("returns 401 without the portal session
  cookie, and never calls the backend").
- `src/components/portal/PaymentMethods/PaymentMethods.tsx` só manipula
  campos de resumo não sensíveis (`brand`, `last4`, `expiry_month/year`,
  `status`) — nunca número de cartão completo.
- Nenhum uso de `dangerouslySetInnerHTML` encontrado em `.tsx` do projeto.
- Nenhum segredo hardcoded encontrado em código ou em `.env.example`;
  `.gitignore` exclui `.env*` exceto `.env.example`, e `git ls-files` não
  lista `.env`/`.env.local`.
- Sem `TODO`/`FIXME`/`XXX`/`HACK` pendentes em `.ts`/`.tsx`.

## Validação desta auditoria

Inspeção estática de rotas BFF, componentes, libs de portal/admin, `.env*`,
`Dockerfile`/`docker-compose.yml` e histórico de commits. Não houve execução
de fluxo integrado com devbutter_backend nem com asaas_payment.
