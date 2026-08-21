import { notFound } from "next/navigation";
import { getQuote, isMockQuoteId } from "@/lib/admin/services/quotes";
import { resolveClientLabel } from "@/lib/admin/services/clients";
import QuoteDetailClient from "./QuoteDetailClient";

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

  return (
    <QuoteDetailClient
      quote={quote}
      clientLabel={resolveClientLabel(quote.account_id)}
      readOnly={isMockQuoteId(id)}
    />
  );
}
