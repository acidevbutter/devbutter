# Prompt — endpoint dedicado de busca global do admin

> Hoje a busca global do admin (`src/components/admin/GlobalSearch/`) é servida
> por um fan-out BFF em `src/app/api/admin/search/route.ts` +
> `src/lib/admin/services/search.ts`, que chama `/admin/clients`, `/admin/companies`,
> `/admin/orders`, `/admin/invoices` e `/admin/quotes/all` e filtra no Node.
> Funciona, mas faz 5 chamadas por tecla (com debounce) e só busca nos campos que
> cada lista já retorna. Este prompt é para um endpoint único no `devbutter_backend`.

## Rota a criar

`GET /admin/search?q=<termo>&limit=<por_grupo>` — auth `CurrentAdminAccount`.

- `q`: mínimo 2 caracteres; abaixo disso responder `{ "groups": [] }`.
- `limit`: default 5, máximo 10, aplicado **por grupo**.

## Resposta (igual ao que o frontend já consome — `src/lib/admin/search.ts`)

```json
{
  "groups": [
    {
      "group": "Clientes",
      "items": [
        { "label": "Ateliê Corvo", "sub": "contato@ateliecorvo.com", "href": "/admin/clients/<id>" }
      ]
    }
  ]
}
```

- Ordem dos grupos: `Clientes`, `Empresas`, `Orders`, `Invoices`, `Quotes`,
  `Conversas`. Omitir grupos vazios.
- `href` sempre aponta para uma rota de detalhe já existente no admin.
- `label` = identificador principal; `sub` = 1 dado de contexto (e-mail, CNPJ,
  valor+status, resumo truncado).

## Cobertura de busca por entidade

| grupo     | casar em                                            | href                        |
|-----------|----------------------------------------------------|-----------------------------|
| Clientes  | nome, e-mail, CPF/CNPJ                              | `/admin/clients/{id}`       |
| Empresas  | nome, CNPJ, nome do dono                           | `/admin/companies/{id}`     |
| Orders    | id, nome do cliente, escopo herdado do quote      | `/admin/orders/{id}`        |
| Invoices  | id Asaas, nome do cliente                          | `/admin/invoices` (âncora)  |
| Quotes    | resumo do escopo, nome do cliente                  | `/admin/quotes/{id}`        |
| Conversas | nome do cliente/visitante, trecho de mensagem     | `/admin/conversations?open={id}` |

## Depois de existir

Trocar `runAdminSearch` em `src/lib/admin/services/search.ts` por uma única
chamada `adminFetch("/admin/search?q=...")`. O route handler
`src/app/api/admin/search/route.ts` e o componente `GlobalSearch` não mudam.
