---
category: Foundations
---
Voice is the copy half of the design system. Every string in a component follows these rules. The full brand guidelines are in `.claude/brand-voice-guidelines.md` (superproject root); this page is the part a component author needs.

DevButter comes from physics: disordered microscopic configurations give rise to order and information, and a problem is solved by the most economical path, like a particle following the trajectory of least action. In the UI that lens shows up as **behaviour, not vocabulary**. The copy is **concrete, close, frank about AI, problem first and rigorous**. It is never hype, slang or exclamation, never "an AI agency", and never physics jargon in a button, form, error or bill.

## Who reviews

Never write "engenheiro". Nobody on the team is introduced by title (and *engenheiro* is a regulated professional title in Brazil). The person who reviews is **alguém do time** / **uma pessoa do time**. The founder is never mentioned in product copy; bios are the only place for him.

## Language

All interface text is pt-BR, **admin included**. Code nouns stay in code:

| In code | On screen |
|---|---|
| `quote` | orçamento |
| `order` | pedido |
| `invoice` | fatura |
| `draft` | rascunho |
| `approved` / `rejected` | aprovado / recusado |
| `dashboard` (client-facing) | sua conta |

Proper names (WhatsApp, PIX, Asaas) stay as they are.

## Case and punctuation

- Headings, buttons and labels use sentence case: "Começar a conversa".
- Mono labels and badges are lowercase in source ("o problema", "pendente"). Eyebrows are written in sentence case, and CSS adds the uppercase.
- Short editorial headlines end with a full stop ("Problemas que deixaram de doer."). Buttons, labels, eyebrows and badges don't.
- No exclamation marks, and no emoji. Use → / ← for text-link affordance and · to separate items inline.
- A running action uses a gerund plus the ellipsis character: "Aprovando…".

## By component

| Component | Rule | Yes | No |
|---|---|---|---|
| **Button** | infinitive verb + object; one primary per screen | Confirmar dados · Ver cases | Clique aqui · Saiba mais · OK |
| **Primary brand CTA** | always leads to the diagnosis | Começar o diagnóstico* | Fale com um especialista |
| **Badge** | the state in one lowercase word | pendente · paga · vencida | PENDING · draft |
| **Field label** | names the thing | E-mail · Nome da empresa | Digite seu e-mail aqui |
| **Field hint** | what's optional or expected | opcional · só pra responder sobre o diagnóstico | — |
| **Field error** | says what to do, no blame | Preencha um e-mail válido. | E-mail inválido! |
| **Error (system)** | what happened + what to do now | Falha de conexão — tente de novo em instantes. | Erro 500 |
| **Success** | short, plus what happens next | Recado recebido. Alguém do time responde no seu e-mail em horário comercial. | Sucesso! |
| **Empty state** | says what's missing and offers the next step | Nenhum orçamento ainda. Começar o diagnóstico → | Nada aqui :( |
| **Confirm (destructive)** | names the object, says what changes | Recusar este orçamento? O cliente recebe um aviso. | Tem certeza? |
| **AI-generated content** | always labelled, always says a person reviews it | estimativa da IA · alguém do time revisa antes de virar proposta | revisado por um engenheiro |
| **Consent / billing** | formal "para", no humour | Autorizo a DevButter a me contatar sobre este diagnóstico. | — |

\* The canonical CTA label is still an open decision (guidelines §11). Until it's settled, don't add a third variant.

## Words to avoid

revolucionar, disruptivo, transformação digital, solução inovadora, de ponta, alavancar, sinergia, potencializar, "o melhor", "líder", "garantido", "100%", chatbot / robô (say *agente*), engenheiro / especialista / consultor (say *alguém do time*), "quântico" and any physics term used as decoration.

## Colour carries meaning, so copy must too

A pink element must contain words that name the problem; a green one names the action or the result. If you can't say in words why something is pink, it shouldn't be pink.
