# Admin API contracts

This document is the source of truth for every backend route the admin dashboard
(`src/app/admin/**`) consumes. The routes are implemented in `devbutter_backend`; it is written
from the frontend so the mock layer (`src/lib/admin/mock/*.ts`, `src/lib/admin/services/*.ts`)
has an exact shape to implement against — **when `devbutter_backend` builds these for real,
the mocks should be swappable for a `fetch` call with no shape changes downstream.**

Conventions match the existing backend (`app/admin/router.py`, `app/accounts/schemas.py`, etc.):
JWT bearer auth via `CurrentAdminAccount`, `snake_case` fields, UUIDs as strings, `datetime` as
ISO-8601, `Decimal` amounts serialize as JSON strings, errors as `{"detail": ...}`.

---

## `GET /admin/quotes`

Returns the draft review queue used by the approval workflow.

## `GET /admin/quotes/all`

Returns all quotes with optional `status`, `page` and `page_size` filters for the complete Cotações list.

**Response `200`**: `{ items: QuoteRead[], total, page, page_size }`

---

## `GET /admin/clients`

List every account (client), for the admin Clientes list/search. `GET /accounts/me` remains scoped to
the caller's own account.

**Auth**: `CurrentAdminAccount`

**Query params**: `search?: string` (matches name/email/CPF/CNPJ), `page?: int = 1`, `page_size?: int = 20`

**Response `200`**: `AdminClientListRead`
```jsonc
{
  "items": [
    {
      "id": "uuid",
      "name": "string",
      "business_name": "string | null",
      "email": "string",
      "cpf": "string | null",
      "cnpj": "string | null",
      "created_at": "datetime",
      "asaas_customer_id": "string | null",  // from AsaasCustomerLink, null if never linked
      "quotes_count": "int",
      "orders_count": "int"
    }
  ],
  "total": "int",
  "page": "int",
  "page_size": "int"
}
```

## `GET /admin/clients/{account_id}`

Client 360° view for the Cliente Detail screen (1f): profile + Asaas link status + per-domain counts.
Reuses `AccountRead` fields plus admin-only aggregate data.

**Auth**: `CurrentAdminAccount`

**Response `200`**: `AdminClientDetailRead`
```jsonc
{
  "id": "uuid",
  "name": "string",
  "business_name": "string | null",
  "email": "string",
  "cpf": "string | null",
  "cnpj": "string | null",
  "phone": "string | null",
  "created_at": "datetime",
  "asaas_customer_id": "string | null",
  "asaas_status": "\"vinculado\" | \"em_analise\" | \"nao_vinculado\"",
  "counts": { "quotes": "int", "orders": "int", "invoices": "int", "catalog_entries": "int", "conversations": "int" }
}
```

**Errors**: `404` if `account_id` doesn't exist.

## `GET /admin/orders`

All orders across every account, for the Orders list screen. `GET /orders` remains scoped to the
caller's own orders.

**Auth**: `CurrentAdminAccount`

**Query params**: `status?: "created" | "invoiced" | "completed" | "cancelled"`, `search?: string` (client name), `page?`, `page_size?`

**Response `200`**: `AdminOrderListRead`
```jsonc
{
  "items": [
    {
      "id": "uuid",
      "quote_id": "uuid",
      "account_id": "uuid",
      "account_name": "string",       // denormalized for the table, avoids an N+1 client lookup
      "status": "created | invoiced | completed | cancelled",
      "amount": "string",             // Decimal, from the order's invoice(s)
      "created_at": "datetime"
    }
  ],
  "total": "int", "page": "int", "page_size": "int"
}
```

## `GET /admin/invoices`

All invoices across every account/order, for the Invoices list screen (1h). The nested
`GET /orders/{order_id}/invoices` route remains available for a known order.

**Auth**: `CurrentAdminAccount`

**Query params**: `status?: "PENDING" | "OVERDUE" | "RECEIVED" | "REFUNDED"`, `due_before?: date`, `page?`, `page_size?`

**Response `200`**: `AdminInvoiceListRead`
```jsonc
{
  "items": [
    {
      "id": "uuid",
      "order_id": "uuid",
      "account_name": "string",
      "asaas_invoice_id": "string",
      "amount": "string",
      "currency": "string",
      "status": "string",
      "due_date": "date",
      "payment_link": "string | null"
    }
  ],
  "total": "int", "page": "int", "page_size": "int",
  "synced_at": "datetime"           // last time the local table synced from an Asaas webhook
}
```

## `GET /admin/dashboard`

Aggregate metrics for the Dashboard screen (1b). The "quotes aguardando revisão" table is **not**
part of this contract — the frontend sources that from the real `GET /admin/quotes` (draft queue)
directly, this endpoint only covers the stat tiles and activity feed.

**Auth**: `CurrentAdminAccount`

**Response `200`**: `AdminDashboardRead`
```jsonc
{
  "quotes_to_review": "int",          // convenience count; frontend also derives this from GET /admin/quotes
  "active_orders": "int",
  "receivable_open_amount": "string", // Decimal, sum of open invoices
  "overdue_amount": "string",
  "overdue_invoice_count": "int",
  "overdue_client_name": "string | null",
  "recent_activity": [
    { "kind": "invoice_paid | quote_approved | client_created | webhook_processed", "message": "string", "at": "datetime" }
  ]
}
```

## `GET /admin/mind/overview`, `GET/PATCH /admin/mind/settings`

Dashboard de operação da IA e limites seguros do diagnóstico. Todas as rotas exigem
`CurrentAdminAccount`; o `devbutter_backend` consulta o `butter_mind` na rede privada com sua
chave interna, que não é enviada ao navegador.

- `GET /admin/mind/overview`: sessões, leads, grounding, tokens conhecidos, base RAG e uso por
  modelo. Turnos via streaming sem `usage` permanecem explicitamente fora dos totais.
- `GET /admin/mind/settings`: valores efetivos de `max_output_tokens`, histórico, turnos, top-k e
  score mínimo, além de metadados somente leitura do modelo e embeddings.
- `PATCH /admin/mind/settings`: atualiza apenas esses cinco limites com validação de faixa.
- `GET /admin/mind/conversations/{conversation_id}/turn-metrics`: métricas por resposta para a
  conversa exibida no admin.

## `GET /admin/catalog`

Cross-account view of `service_catalog` entries for the top-level Catálogo nav item. The real
`service_catalog` router (`app/service_catalog/router.py`) remains scoped to `CurrentAccount`; this
admin route provides the cross-account read view. Reuses `ServiceCatalogEntryRead`'s fields.

**Auth**: `CurrentAdminAccount`

**Response `200`**: `AdminCatalogListRead`
```jsonc
{
  "items": [
    { "id": "uuid", "account_id": "uuid", "account_name": "string", "type": "string", "description": "string", "created_at": "datetime" }
  ]
}
```

## Knowledge base ("Conhecimento") — feeds AI quote suggestions

New admin-only resource persisted by `devbutter_backend`.

### `GET /admin/knowledge-entries`
**Response `200`**: `KnowledgeEntryRead[]`
```jsonc
[{
  "id": "uuid",
  "name": "string",                 // e.g. "Website institucional"
  "description": "string",
  "price_min": "string",            // Decimal
  "price_max": "string",
  "typical_duration": "string",     // e.g. "4 semanas" — free text like Quote.timeline
  "ai_instructions": "string",
  "updated_at": "datetime"
}]
```
### `POST /admin/knowledge-entries` — body: `{ name, description, price_min, price_max, typical_duration, ai_instructions }` → `201 KnowledgeEntryRead`
### `PATCH /admin/knowledge-entries/{id}` — same fields, all optional → `200 KnowledgeEntryRead`
### `DELETE /admin/knowledge-entries/{id}` → `204`

## `GET /admin/conversations`

All AI concierge conversations across accounts, for the Conversas screen (1j). The regular
`conversations` router remains scoped to the owning account; this admin route provides the cross-account view.

**Auth**: `CurrentAdminAccount`

**Query params**: `has_quote?: bool`, `page?`, `page_size?`

**Response `200`**: `AdminConversationListRead`
```jsonc
{
  "items": [
    {
      "id": "uuid",
      "account_id": "uuid | null",   // null for an anonymous/pre-signup visitor
      "account_name": "string | null",
      "message_count": "int",
      "resulting_quote_id": "uuid | null",
      "started_at": "datetime"
    }
  ],
  "total": "int", "page": "int", "page_size": "int"
}
```

### `GET /admin/conversations/{id}`
Full transcript for the split-pane detail view — this can likely reuse the existing
`GET /conversations/{id}` response shape once that route accepts `CurrentAdminAccount` for
conversations the admin doesn't own (today it's owner-only, mirroring the `orders`/`quotes` pattern
of `account_id != caller and not is_admin -> 404`).

## Webhook event log

`POST /webhooks/asaas` persists every accepted inbound event in an admin-only audit log, which can
be listed and replayed.

### `GET /admin/webhooks/events`
**Query params**: `event_type?: string`, `has_error?: bool`, `page?`, `page_size?`

**Response `200`**: `AdminWebhookEventListRead`
```jsonc
{
  "items": [
    {
      "id": "uuid",
      "event_type": "string",        // e.g. "PAYMENT_RECEIVED"
      "related_invoice_id": "uuid | null",
      "processed_ok": "bool",
      "error_message": "string | null",
      "payload": "object",           // raw Asaas payload, JSON
      "received_at": "datetime"
    }
  ],
  "total": "int", "page": "int", "page_size": "int",
  "error_count": "int"
}
```
### `POST /admin/webhooks/events/{id}/reprocess` → `202`, re-runs the same handler `POST /webhooks/asaas` used originally against the stored `payload`.

---

## Not contracted — deliberately out of scope

- **Password reset / "esqueci minha senha"**: the design shows the link but no target screen. Left
  as a disabled/non-functional link in the login screen; needs product input (email flow? admin resets
  it manually?) before it's worth specifying an endpoint for.
- **Logout**: doesn't need a backend route. Auth is stateless JWT (`app/core/security.py`) with nothing
  server-side to invalidate — the frontend's `POST /api/admin/auth/logout` (a Next.js Route Handler,
  not a backend call) just clears the httpOnly cookies.
