# Changelog

## [Unreleased]

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
