# Prompt para o Claude Design — fluxo de chat para o cliente criar uma cotação

> Este arquivo contém um prompt pronto para colar na skill `design` (Claude
> Design) e gerar um canvas com as telas do fluxo abaixo. Não é o desenho
> em si — é o texto de entrada para gerá-lo. Contexto de por que esse fluxo
> importa e o que já existe (funcional, mas sem design) está descrito antes
> do prompt; o prompt em si vem na seção final, pronto para copiar.

## Contexto (para quem for revisar antes de disparar o prompt)

O backend (`devbutter_backend/app/conversations/`) já implementa o fluxo
completo de "concierge de IA": `POST /conversations` cria uma sessão,
`POST /conversations/{id}/messages` troca mensagens com a IA (via
`butter_mind`) e devolve `{ reply, ready_to_submit }`, e
`POST /conversations/{id}/draft-quote` fecha a conversa em um Quote
`source=ai` com `scope_summary`, `price_range` e `timeline` (todos texto
livre, não campos numéricos estruturados).

Hoje existem duas pontas dessa mesma conversa, em estados bem diferentes:

1. **Portal do cliente já logado** (`NewQuoteModal`,
   `src/components/portal/NewQuoteModal/`) — funcional de verdade, mas é só
   um modal simples (bolhas de mensagem + textarea), sem tratamento visual.
2. **Site público** (`ChatSimulation` na home, CTAs "Falar com a IA" /
   "Solicitar diagnóstico" no Nav/Hero/ClosingCta) — hoje é 100% encenado:
   mensagens hardcoded, sem input do usuário, todo CTA é `href="#"` sem
   ação (ver `../../docs/funcoes-necessarias-site.md` §2.2 — caminho
   relativo à raiz do monorepo `devbutter_app`, um nível acima deste
   repo). É a peça que falta para o funil de conversão de verdade:
   visitante anônimo conversa, a IA monta o diagnóstico, e só então ele é
   convidado a criar conta para salvar a cotação — exatamente como
   descrito em `../../docs/architecture/architecture-ai-quote-client-portal.md`
   (item 4: "The client... is linked to the draft; if they don't have an
   account yet they're prompted to create one to view/save it") e no
   diagrama `../../docs/architecture/diagrams/quote-flow.mmd`.

O prompt abaixo pede as telas dos dois pontos de entrada (visitante anônimo
e cliente logado) como uma única jornada, reaproveitando a linguagem visual
que já existe (janela de chat estilo `ChatSimulation`, paleta e tipografia
do design system atual) — não uma proposta visual nova.

## Prompt

```
Desenhe o fluxo completo de chat em que um visitante ou cliente da
DevButter cria uma cotação (orçamento) conversando com a IA da empresa.
Gere um canvas com um artboard por tela/estado listado abaixo, na ordem,
como uma jornada única.

CONTEXTO DO PRODUTO
DevButter é uma consultoria de engenharia de software (agentes de IA,
automações, plataformas, e-commerce). O site tem um "concierge de IA" que
qualifica o pedido do visitante antes de virar uma cotação de verdade,
revisada por um humano (Marcos) antes de qualquer contato comercial.
Linguagem: direta, técnica sem ser fria, confiante. Nunca promete preço
exato — sempre "faixa estimada" e "sujeito a revisão".

IDENTIDADE VISUAL (reaproveitar exatamente, não criar um novo estilo)
- Fundo escuro quase preto (#05070D / #0B0F18), texto principal quase
  branco (#F5F7FB), texto secundário cinza-azulado (#9CA6B5).
- Verde de destaque #79E59B (com glow #00D26A) e rosa/magenta #F64C6F
  (com glow #FF4FA3) — usados para links, estados ativos, badges de
  status. Um elemento por vez usa a cor de destaque, não os dois juntos
  sem motivo.
- Tipografia: sans-serif para texto corrido (headings/body), "Geist Mono"
  para tudo técnico/numérico (ids, badges de status, timestamps, valores).
- Cards com cantos arredondados (~16-18px), bordas sutis translúcidas
  (rgba branco ~8-14% opacidade), sombras suaves, nunca chapado.
- Referência direta de "janela de chat": um card com header (ponto verde
  pulsante + "online"/"digitando"), área de mensagens com bolhas
  arredondadas (bolha da IA alinhada à esquerda em tom mais escuro que o
  fundo, bolha do usuário alinhada à direita em tom levemente mais claro
  ou com borda verde), e um composer (textarea + botão enviar) fixo embaixo.

TELAS / ARTBOARDS (nesta ordem)

1. "Entrada — site público": a home com o CTA "Falar com a IA" em
   destaque (hero ou nav), mostrando o estado ATUAL de intenção — deixe
   claro no rótulo do artboard que hoje esse botão não faz nada, e que
   esta tela é o "antes" só para dar contexto de onde a conversa começa.

2. "Chat aberto — primeira mensagem": o painel de chat acabou de abrir
   (como um painel lateral ou modal centralizado sobre o site, sua
   escolha), mostrando só a primeira mensagem da IA se apresentando e
   perguntando o que a pessoa precisa. Composer vazio, focado, com
   placeholder tipo "conta o que você precisa...".

3. "Meio da conversa": 4-6 mensagens trocadas, mostrando a IA fazendo
   perguntas de qualificação (tipo de negócio, problema atual, tipo de
   solução desejada — site, plataforma, agente, automação, e-commerce).
   Inclua uma bolha do usuário respondendo com uma frase realista (ex:
   "tenho uma loja e quero automatizar o atendimento no whatsapp").

4. "Pronto para enviar": a IA sinaliza que já tem informação suficiente
   (isso já existe no backend como um booleano `ready_to_submit`) —
   mostre isso como um resumo estruturado aparecendo dentro do próprio
   chat ou logo abaixo dele: escopo resumido, faixa de preço estimada
   (ex: "R$ 8k – 15k"), prazo estimado (ex: "6-8 semanas"), com um botão
   de destaque "Confirmar e enviar" substituindo o composer normal.

5. "Gate de conta — visitante sem login": ao confirmar, se a pessoa não
   tem conta, mostre um passo intermediário pedindo e-mail/senha (ou
   "continuar com Google", se fizer sentido no seu desenho) com a
   mensagem de que é só para salvar e acompanhar essa cotação — não é
   uma parede de cadastro genérica, é contextual ("crie uma conta para
   acompanhar sua cotação").

6. "Confirmação": tela final mostrando que o pedido foi registrado como
   rascunho aguardando revisão (use a badge/estado "aguardando revisão",
   mesma linguagem usada no painel admin), com o resumo da cotação e um
   link/botão para "ir para meu painel".

7. "Variante: cliente já logado": a mesma janela de chat, mas aberta de
   dentro do portal do cliente (com a barra lateral do portal ao fundo,
   estilo "Visão geral / Meus projetos / Orçamentos..."), sem o passo 5
   (gate de conta) — direto do "pronto para enviar" para a confirmação,
   já dentro do painel.

RESTRIÇÕES
- Não invente uma paleta ou tipografia novas — é uma extensão do que já
  existe, mesmo produto.
- Não desenhe fluxo de pagamento nem detalhes de checkout — a cotação é
  só o diagnóstico + faixa de preço, pagamento acontece depois, quando
  Marcos aprova manualmente.
- Preço e prazo são sempre faixas/estimativas em texto livre, nunca um
  valor fechado nem um formulário de "quanto você quer pagar".
- Mobile-first não é obrigatório, mas deixe o card de chat com largura
  máxima confortável (não esticado full-width em telas grandes).
```
