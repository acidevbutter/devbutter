# Prompt — corrigir a porta de `API_BASE_URL` em `.env.example`

> Achado da auditoria `docs/auditoria-seguranca-2026-08-29.md` (item 2,
> severidade MÉDIA). Não é uma falha de segurança, é um ambiente de dev
> quebrado: `.env.example` manda usar a porta 8002, mas o código e os
> testes esperam 8000.

## Onde está o mismatch

- `.env.example` (raiz do repo):
  ```
  # Padrão local: uvicorn rodando em devbutter_backend na porta 8002.
  API_BASE_URL=http://localhost:8002
  ```
- `src/lib/portal/config.ts:3`:
  ```ts
  export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";
  ```
- Todos os testes de rota BFF de pagamento esperam `8000`, por exemplo
  `src/app/api/portal/payment-methods/route.test.ts:50`
  (`expect(url).toBe("http://localhost:8000/payment-methods")`) e o
  equivalente em `pay/route.test.ts` e
  `[payment_method_id]/route.test.ts`.
- O `.env` local deste checkout também está inconsistente: valor `8002`
  com comentário dizendo "porta 8000" ao lado.

## O que corrigir

1. Confirmar qual é a porta real que `devbutter_backend` usa em dev antes
   de decidir qual lado corrigir — pelo padrão dos testes e do fallback em
   `config.ts`, o valor certo parece ser **8000**. Se o backend
   efetivamente sobe em 8002 em algum fluxo (ex: Socket.IO, que já usa
   `NEXT_PUBLIC_SOCKET_URL=http://localhost:8002` de propósito), deixar
   claro no comentário que são portas diferentes por design — não
   "arredondar" as duas para o mesmo valor sem checar.
2. Atualizar `.env.example`:
   ```
   # Origem do devbutter_backend (FastAPI) que o /admin consome. Server-only —
   # nunca é exposta ao client, o token de sessão fica em cookie httpOnly.
   # Padrão local: uvicorn rodando em devbutter_backend na porta 8000.
   API_BASE_URL=http://localhost:8000
   ```
3. Atualizar o `.env` local (não versionado, mas presente neste checkout)
   para o mesmo valor, removendo o comentário desalinhado.
4. Conferir `docker-compose.yml` — hoje define
   `API_BASE_URL: http://platform-api:8000` para o serviço `web`, que já
   está alinhado com `config.ts`/testes; só o `.env.example` está
   divergente.
5. Rodar `yarn vitest run src/app/api/portal/payment-methods` depois da
   mudança para confirmar que nada além do `.env.example` dependia do
   valor errado.

## Definição de pronto

- `.env.example` e `.env` local com a mesma porta que `config.ts` usa como
  fallback e que os testes de rota esperam.
- Comentários explicando a porta batem com o valor ao lado.
- Testes de `payment-methods/**` continuam verdes sem alteração.
