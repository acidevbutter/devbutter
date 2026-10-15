import { notFound } from "next/navigation";
import { getQuote } from "@/lib/admin/services/quotes";
import { getClient, resolveClientLabel } from "@/lib/admin/services/clients";
import { getConversation } from "@/lib/admin/services/conversations";
import QuoteDetailClient, { type LinkedClient } from "./QuoteDetailClient";

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let quote;
  try {
    quote = await getQuote(id);
  } catch {
    notFound();
  }

  const [clientLabel, client, conversation] = await Promise.all([
    resolveClientLabel(quote.account_id),
    getClient(quote.account_id).catch(() => null),
    quote.conversation_id
      ? getConversation(quote.conversation_id).catch(() => null)
      : Promise.resolve(null),
  ]);

  const linkedClient: LinkedClient | null = client
    ? {
        business_name: client.business_name,
        name: client.name,
        email: client.email,
        cnpj: client.cnpj,
        cpf: client.cpf,
        asaas_customer_id: client.asaas_customer_id,
      }
    : null;

  return (
    <QuoteDetailClient
      quote={quote}
      clientLabel={clientLabel}
      linkedClient={linkedClient}
      accountId={quote.account_id}
      conversationMessageCount={conversation?.message_count ?? null}
      readOnly={false}
    />
  );
}
