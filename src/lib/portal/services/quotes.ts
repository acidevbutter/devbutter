import "server-only";
import type { OrderRead, QuoteRead } from "@/lib/admin/types";
import { portalFetch } from "../api";
import type { PortalQuote } from "../types";

export async function listQuotes(): Promise<PortalQuote[]> {
  const [quotes, orders] = await Promise.all([
    portalFetch<QuoteRead[]>("/quotes"),
    portalFetch<OrderRead[]>("/orders"),
  ]);
  const projectByQuote = new Map(orders.map((order) => [order.quote_id, order.id]));

  return quotes
    .map((quote) => ({
      id: quote.id,
      status: quote.status as PortalQuote["status"],
      title: quote.scope_summary,
      description: quote.scope_summary,
      priceRange: quote.price_range,
      timeline: quote.timeline,
      createdAt: quote.created_at,
      projectId: projectByQuote.get(quote.id) ?? null,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
