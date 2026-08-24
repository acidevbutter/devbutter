# Alterações recomendadas no frontend — orçamento com IA

O frontend passa a refletir o fluxo recomendado em quatro estados:

1. **Conversa:** visitante envia mensagens; a sessão pode ser anônima.
2. **Prévia:** cada turno pode retornar `preview` com escopo, serviços, faixa, prazo, origem do grounding e pendências.
3. **Gate de conta:** somente depois de revisar a prévia o visitante informa e-mail/senha ou o cliente autenticado confirma.
4. **Confirmação:** o frontend mostra `COT-xxxx`, status aguardando revisão e deixa claro que a faixa não é cobrança aprovada.

O endpoint `/api/portal/conversations/current` precisa devolver `draft_preview` para que o modal retomado não perca a prévia. O evento Socket.IO `assistant_done` precisa carregar `preview`; o frontend nunca deve fabricar escopo, preço ou prazo.

O backend continua sendo a autoridade: `draft-quote` reextrai o transcript, valida `ready_to_submit` e cria somente uma `Quote` em `draft`. O frontend apenas apresenta a prévia e encaminha a confirmação.
