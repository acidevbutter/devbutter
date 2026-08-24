import { portalErrorResponse, portalFetchOptionalAuth } from "@/lib/portal/api";
import { clearConversationCookie, setPortalSessionCookies } from "@/lib/portal/session";

type DraftQuoteResponse = {
  quote_id: string;
  reference: string;
  scope_summary: string;
  price_range: string | null;
  timeline: string | null;
  tokens: { access_token: string; refresh_token: string } | null;
  pending_account_link: boolean;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const quote = await portalFetchOptionalAuth<DraftQuoteResponse>(`/conversations/${id}/draft-quote`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (quote.tokens) {
      await setPortalSessionCookies(quote.tokens);
    }
    await clearConversationCookie();
    return Response.json(quote, { status: 201 });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
