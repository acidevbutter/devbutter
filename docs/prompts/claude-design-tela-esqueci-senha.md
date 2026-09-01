# Prompt para o Claude Design — tela "esqueci minha senha"

> Este arquivo contém um prompt pronto para colar na skill `design` (Claude Design) e gerar um
> canvas com as telas do fluxo abaixo. Não é o desenho em si — é o texto de entrada para
> gerá-lo. Contexto de por que esse fluxo importa e o que já existe está antes do prompt; o
> prompt em si vem na seção final, pronto para copiar.

## Contexto (para quem for revisar antes de disparar o prompt)

O backend já implementa o fluxo de recuperação de senha por completo (ver
`devbutter_backend/app/accounts/router.py:190-223`: `POST /accounts/password-recovery`,
`GET /accounts/password-recovery/{token}`, `POST /accounts/password-recovery/complete`) e o
prompt `docs/prompts/completar-fluxo-esqueci-senha.md` (neste repositório) cobre as rotas
Next.js que vão consumir esse backend. O que falta é só a tela — nenhuma existe hoje.

Existe um precedente quase idêntico no próprio código: `src/app/portal/senha/[token]/page.tsx`,
a tela de "definir senha" usada no onboarding via chat (`PasswordSetupToken`). Ela já resolve o
mesmo problema de UX — link único, três estados (carregando / inválido-expirado / válido com
formulário) — com o estilo visual atual do portal (`Senha.module.scss`, cartão claro sobre fundo
escuro, mesmo padrão de `src/app/portal/login/page.tsx`). O fluxo de recuperação de senha é
essencialmente essa mesma tela, mais uma etapa antes (pedir o e-mail) e uma tela de confirmação
de envio — não uma proposta visual nova.

Rotas que este fluxo introduz no App Router (a UI deste prompt define o conteúdo de cada uma):

- `/portal/recuperar-senha` — formulário para digitar o e-mail (pode receber `?email=` da tela de
  login, ver prompt do BFF).
- `/portal/recuperar-senha/[token]` — mesma forma de `senha/[token]`: checa o token
  (`GET /api/portal/auth/password-recovery/{token}`), mostra formulário de nova senha se válido,
  mensagem de link inválido/expirado se não.

O link "Esqueci minha senha" em `src/app/portal/login/page.tsx:150` hoje é um `<div>` estático
sem ação — ele deve apontar para `/portal/recuperar-senha` (já coberto pelo prompt do BFF, mas
vale confirmar visualmente no canvas que o link parece clicável, já que hoje o CSS trata como
texto simples).

## Prompt

```
Desenhe o fluxo completo de "esqueci minha senha" do portal de clientes da DevButter. Gere um
canvas com um artboard por tela/estado listado abaixo, na ordem, como uma jornada única.

CONTEXTO DO PRODUTO
DevButter é uma consultoria de engenharia de software. O portal do cliente é onde ele acompanha
orçamentos, faturas e projetos -- área logada, tom direto e profissional, sem o clima "vendas"
do site público. Este fluxo é puramente utilitário: alguém esqueceu a senha e precisa
recuperá-la com segurança e o mínimo de fricção.

IDENTIDADE VISUAL (reaproveitar exatamente o que já existe no portal, não criar um novo estilo)
- Tela de login/definir-senha atual: cartão centralizado sobre fundo escuro, logomark +
  wordmark "DevButter" (o "Butter" em verde) no topo do cartão, abaixo um texto de apoio em
  cinza claro, campos com label em caixa alta pequena acima do input (ex.: "E-MAIL", "NOVA
  SENHA"), botão de ação principal em largura total, mensagens de erro em vermelho/rosa abaixo
  dos campos, mensagens de espera ("verificando o link...") como texto simples sem spinner
  chamativo.
- Mesma paleta e tipografia do restante do portal: fundo escuro, texto principal quase branco,
  acentos em verde (#79E59B / glow #00D26A) para estado positivo/ação, rosa/vermelho para erro.
- Cartão com cantos arredondados (~16-18px), sem sombra pesada, consistente com
  src/app/portal/login/page.tsx e src/app/portal/senha/[token]/page.tsx -- este fluxo deve
  parecer a mesma família de telas, não algo novo.

TELAS / ARTBOARDS (nesta ordem)

1. "Login -- ponto de entrada": a tela de login atual do portal, com o link "Esqueci minha
   senha" abaixo do botão Entrar. Deixe visualmente claro que este link é clicável (hoje no
   código é só texto estático sem estilo de link -- proponha o tratamento visual correto:
   sublinhado, cor de destaque sutil, ou cursor pointer implícito no desenho).

2. "Pedir recuperação -- formulário": rota /portal/recuperar-senha. Cartão com o mesmo cabeçalho
   de marca, um texto de apoio curto ("informe seu e-mail para receber um link de recuperação"),
   campo único de e-mail (label "E-MAIL", pode vir pré-preenchido se o usuário chegou aqui a
   partir da tela de login com e-mail já digitado), botão "Enviar link de recuperação", e um
   link secundário discreto "Voltar para o login".

3. "Pedido enviado -- confirmação": estado que substitui o formulário no mesmo cartão depois do
   envio (não uma rota nova). Mensagem neutra do tipo "se esse e-mail existir na nossa base,
   você vai receber um link em instantes" -- deliberadamente vago sobre se o e-mail existe ou
   não (é uma decisão de segurança do backend, não mostre nunca "e-mail não encontrado" aqui).
   Inclua um link discreto para reenviar / voltar ao login.

4. "Link expirado ou inválido": rota /portal/recuperar-senha/[token] quando o token já foi usado,
   expirou (45 minutos) ou não existe. Mesmo cartão, mensagem de erro central (sem formulário),
   e um botão/link levando de volta a /portal/recuperar-senha para pedir um novo link.

5. "Definir nova senha -- token válido": rota /portal/recuperar-senha/[token] quando o token é
   válido. Cartão com texto de apoio curto, campo único "NOVA SENHA" (mínimo 8 caracteres,
   mostrar essa regra como hint abaixo do campo), botão "Salvar nova senha e entrar" -- ao
   concluir o usuário é autenticado direto, sem passar pela tela de login de novo (mesmo
   comportamento do fluxo de definir-senha do onboarding).

6. "Erro ao salvar": estado de erro dentro da tela 5 (mesmo cartão, não uma rota nova) para
   senha curta demais ou falha de conexão -- mensagem de erro abaixo do campo, campo mantém o
   que foi digitado, botão volta ao estado ativo (não travado em "salvando...").

Para cada artboard, anote ao lado (fora da área do cartão, como legenda) qual chamada de API o
estado representa (ex.: "POST /api/portal/auth/password-recovery", "GET
/api/portal/auth/password-recovery/{token} -> 404") -- essas rotas já estão definidas e não fazem
parte do que este canvas precisa especificar, só ajuda quem for implementar a associar tela a
endpoint.

Gere as 6 telas como artboards separados em um único canvas, na ordem acima, com um título curto
em cada artboard indicando a rota e o estado.
```
