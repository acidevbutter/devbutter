import { notFound } from "next/navigation";
import { getQuote } from "@/lib/admin/services/quotes";
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

  const clientLabel = await resolveClientLabel(quote.account_id);

  return <QuoteDetailClient quote={quote} clientLabel={clientLabel} readOnly={false} />;
}
