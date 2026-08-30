# Prompt — parar de mandar a apiKey da Asaas crua pro client

> Achado da auditoria `docs/auditoria-seguranca-2026-08-29.md` (item 1,
> severidade ALTA). Hoje `src/app/admin/(dashboard)/config/asaas/page.tsx`
> passa `AsaasAccessToken[]` (com `apiKey` completo) como prop para
> `AsaasConfigClient`, um `"use client"` component. Em Next.js App Router,
> props de Server Component para Client Component vão no payload RSC/flight
> que chega ao navegador inteiro — o `maskTail()` só mascara na hora de
> desenhar a tela, o valor cru já está no HTML/JS que o browser recebeu.
> Isso vaza a chave de API do provedor de pagamento para qualquer sessão
> admin que abra `/admin/config/asaas?tab=tokens`.

## Objetivo

A apiKey nunca deve sair do servidor em texto puro. O componente client só
deve receber a versão já mascarada.

## Onde mexer

- `src/lib/admin/asaas-types.ts:28-33` — tipo `AsaasAccessToken`.
- `src/lib/admin/services/asaas.ts:49-53` — `listAccessTokens()`.
- `src/app/admin/(dashboard)/config/asaas/page.tsx:52-53` — chamada que
  monta `tabData.tokens`.
- `src/app/admin/(dashboard)/config/asaas/AsaasConfigClient.tsx:329` — uso
  de `maskTail(t.apiKey ?? t.id, 6)`.

## O que fazer

1. Em `listAccessTokens()` (server-only, já roda no servidor), mascarar o
   `apiKey` **antes** de retornar para `page.tsx`:

   ```ts
   // src/lib/admin/services/asaas.ts
   export async function listAccessTokens(
     accountId: string
   ): Promise<AsaasListEnvelope<AsaasAccessToken> | AsaasAccessToken[]> {
     const result = await adminFetch(
       `/admin/subaccounts/${encodeURIComponent(accountId)}/access-tokens`
     );
     return maskAccessTokens(result);
   }

   function maskAccessTokens<T extends AsaasListEnvelope<AsaasAccessToken> | AsaasAccessToken[]>(
     result: T
   ): T {
     const mask = (t: AsaasAccessToken): AsaasAccessToken => ({
       ...t,
       apiKey: t.apiKey ? maskTail(t.apiKey, 6) : t.apiKey,
     });
     return Array.isArray(result)
       ? (result.map(mask) as T)
       : ({ ...result, data: result.data.map(mask) } as T);
   }
   ```

2. Em `AsaasConfigClient.tsx:329`, trocar
   `maskTail(t.apiKey ?? t.id, 6)` por `t.apiKey ?? maskTail(t.id, 6)` — o
   valor que chega já está mascarado; o componente client só exibe, não
   mascara mais nada sensível.

3. Ajustar o tipo para deixar explícito que isso nunca é a chave crua:

   ```ts
   // src/lib/admin/asaas-types.ts
   export interface AsaasAccessToken {
     id: string;
     name?: string;
     status?: string;
     createdAt?: string;
     /** Já mascarada pelo servidor (ex: "••••ab12cd") — nunca a chave crua. */
     apiKey?: string;
     [key: string]: unknown;
   }
   ```

4. Se alguma ação futura (ex: "copiar chave completa") precisar do valor
   integral, ela **não** deve buscar isso via prop de Server Component. Crie
   uma Server Action ou rota BFF dedicada (`POST
   /api/admin/asaas/access-tokens/[id]/reveal`) que:
   - exige confirmação explícita do admin (o componente já tem um padrão de
     confirmação em `setConfirm({...})`, reaproveitar);
   - devolve a chave crua só naquela resposta pontual, nunca em uma listagem;
   - idealmente loga o reveal em audit log (mesmo padrão de
     `AsaasAuditLog`).
   Sem esse requisito confirmado, não implementar — manter só a versão
   mascarada ponta a ponta é a opção mais segura e é o suficiente para
   fechar o achado da auditoria.

## Teste a escrever

- Teste de `listAccessTokens` garantindo que o `apiKey` retornado nunca
  contém a string completa devolvida pelo mock do `adminFetch` (comparar
  que o resultado é `maskTail(rawKey, 6)`, não `rawKey`).
- Teste de `page.tsx` (ou snapshot do `tabData` passado a
  `AsaasConfigClient`) garantindo que nenhum valor de `apiKey` no props
  bate com um valor "cru" de fixture — proteção contra regressão se alguém
  reintroduzir `adminFetch` sem passar pelo `maskAccessTokens`.

## Definição de pronto

- `curl`/teste de integração no endpoint mockado do backend retornando um
  `apiKey` "cru" de teste (ex: `"$aact_prod_ABCDEF123456"`), e o snapshot do
  HTML/RSC payload renderizado por `/admin/config/asaas?tab=tokens` não
  contém a substring crua em nenhum lugar — só a versão mascarada.
