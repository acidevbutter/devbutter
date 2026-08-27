# Prompt — conectar o Butter Relay ao painel admin

> Contexto para quem for implementar no `devbutter_backend`. O frontend já tem a
> tela `Configurações › Butter Relay` (`src/app/admin/(dashboard)/config/relay/`)
> renderizada em estado "não conectada ao painel". Ela fica inerte até estas
> rotas existirem. O Relay tem um painel interno próprio de operação; o objetivo
> aqui é dar ao admin **configuração e diagnóstico**, não reimplementar o painel.

## O que existe hoje

- `butter_relay` recebe eventos por fila (o backend publica, não consulta).
- Não há rota admin no `devbutter_backend` que exponha estado do Relay.

## Rotas admin a criar (`/admin/relay/*`, auth = `CurrentAdminAccount`)

1. `GET /admin/relay/status`
   - `{ connected: bool, environment: str, default_sender: str | null, checked_at: datetime }`
   - health check real contra o Relay (ping/version), sem vazar credenciais.

2. `GET /admin/relay/events` e `PATCH /admin/relay/events/{event_key}`
   - lista de eventos automáticos com `{ event_key, label, enabled }`.
   - `event_key ∈ { new_lead, signup_confirmation, quote_approved, invoice_created,
     payment_failed, webhook_received }`.
   - `PATCH` recebe `{ enabled: bool }` e persiste no Relay.

3. `GET /admin/relay/templates`
   - `[{ id, name, event_key, updated_at }]`. `GET /admin/relay/templates/{id}/preview`
     devolve HTML renderizado com dados de exemplo (nunca dados reais de cliente).

4. `GET /admin/relay/queue`
   - `{ sent: int, pending: int, failed: int, recent: [{ template, recipient_masked,
     status, failed_reason | null, created_at }] }`.
   - `POST /admin/relay/queue/{message_id}/resend` para reenfileirar uma falha.

5. `POST /admin/relay/test` → dispara um e-mail de teste para o admin autenticado.

## Contrato que o frontend espera

Quando as rotas existirem, criar em `src/lib/admin/services/relay.ts` (espelhando
`services/asaas.ts`) + `actions/relay.ts`, e trocar o bloco `.preview` de
`config/relay/page.tsx` por dados reais. Enquanto `GET /admin/relay/status`
responder 404/501, manter o estado "não conectada ao painel".

## Segurança

- Nenhuma API key, token ou certificado do Relay pode transitar pelo browser.
- `recipient_masked`: só domínio + primeiros caracteres (`ana•••@empresa.com`).
- Previews de template usam dados sintéticos, nunca PII real.
