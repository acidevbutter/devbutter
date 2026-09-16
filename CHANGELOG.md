# Changelog

## [Unreleased]

- Infraestrutura: imagens Docker e pipeline do frontend atualizadas para Node 24.
- Corrigido o lint dos testes de métodos de pagamento.

- Adicionado mapa Mermaid e teste HTTP integrado que percorre todos os Route
  Handlers BFF com Next e upstream controlado; a imagem Docker e a pipeline
  executam os testes antes do build.
  O E2E usa `.next-e2e`, sem disputar o servidor de desenvolvimento local.

- Painel Asaas: adicionada criação de chave de integração interna na aba
  Tokens. O segredo continua cifrado no proxy e não é exibido no navegador.

- Fluxo Cotação IA — ajustes de UX no `NewQuoteModal`:
  - textarea do composer com autosize até `COMPOSER_MAX_H` (160px), aí rola
    (`resize: none`);
  - painel para de rolar; `.scrollRegion` rola e o thread passa por trás do
    header e do composer `position: sticky` (com gradiente);
  - quando aparecem opções tocáveis: o composer some, o thread congela
    estacionado no fim; link "escrever resposta" traz o composer de volta
    (respeita `allow_free_text`);
  - "Continuar conversando" na tela de confirmação volta ao mesmo thread sem
    abrir conversa nova;
  - textos não citam mais nomes de pessoas ("o time da DevButter").
- Etapa de review lê as opções de `preview.field_options` (catálogo do
  butter_mind); `SERVICE_OPTIONS`/`BUDGET_OPTIONS`/`TIMELINE_OPTIONS` viram
  fallback para preview antigo. Tipo `DiagnosisPreview` aponta para o schema
  canônico do butter_mind (ADR-0005).
- Fluxo Cotação IA turno 2 (ADR-0004): o `NewQuoteModal` renderiza os estados
  `stage` — `choosing` mostra 2-3 cards de opção (título, resumo, faixa/prazo,
  badge "recomendado", botão "Confirmar «título»"); `collecting` mostra um
  mini-form dos `missing_fields` do negócio + "pular por agora"; o composer
  continua disponível. Novos proxies BFF
  `api/portal/conversations/[id]/select-option` e `.../business-profile`.
- Fluxo Cotação IA reconciliado com o canvas `Fluxo Cotacao IA.dc.html`
  (ADR-0003): **rota `/cotacao` removida**. O `NewQuoteModal` agora tem duas
  superfícies — `panel` (público, painel de coluna única ancorado à direita
  sobre o site, canvas 1b, minimizável, sem arrastar) e `workspace` (portal,
  overlay de duas colunas com o **dossiê ao vivo** à esquerda + chat à direita,
  canvas 2a, com a spec de movimento 2c: `rowIn`/`sweep`/`fly`/`tick`/`shimmer`
  + anel de completude, respeitando `prefers-reduced-motion`). Novo
  `ConciergeCta` client component; Nav, Hero, ChatSimulation, Concierge e
  ClosingCta abrem o painel público em vez de linkar `/cotacao`. Chip row 1c
  ganha `cidade` e os `business_metrics` do contrato estendido.
- Tornada a imagem Docker apta a produção com `next build` e `next start`.

- Documentados os fluxos existentes do frontend em Markdown e Mermaid, com pontos fortes, falhas,
  lacunas e limites da validação estática.

- Adicionada composição Docker de desenvolvimento com autoreload, volume do código e conexão à
  rede externa `devbutter_shared`.

- Alinhado o contrato do portal para `invoice_id` e operações `save_only`/`save_and_pay`;
  adicionados BFFs para listar e revogar métodos de pagamento.

- Adicionadas rotas BFF autenticadas para contexto e envio opaco de métodos de pagamento, sem receber ou persistir dados de cartão em claro.

- Adicionado helper client-side de envelope AES-256-GCM v1 para payloads sensíveis, sem persistência de dados do cartão.

- Adicionado controle de orçamento mensal e custo por fluxo na tela IA & Métricas.

- Adicionado painel administrativo de IA com métricas de grounding/tokens, configurações de
  diagnóstico e métricas por conversa, consumindo o backend autenticado.
- O modal de novo orçamento exibe a prévia estruturada do diagnóstico, grounding e pendências,
  inclusive ao retomar uma conversa; documentadas as alterações do fluxo recomendado.
- Unificado o nome interno da URL da API em `API_BASE_URL`.
- Conectado o portal ao `devbutter_backend` com JWT, refresh de sessão, perfil,
  catálogo, quotes, orders, invoices e concierge de novo orçamento.
- Adicionados sete diagramas Mermaid coloridos para revisão da jornada de
  cotação assistida por IA, incluindo os bloqueios atuais de contrato.
