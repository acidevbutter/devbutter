import { redactPrices } from "@/lib/portal/redact";
import { portalErrorResponse, portalFetchOptionalAuth } from "@/lib/portal/api";

// ADR-0004: the visitor picked one of the concierge's proposed paths.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const turn = await portalFetchOptionalAuth(`/conversations/${id}/select-option`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(redactPrices(turn));
  } catch (error) {
    return portalErrorResponse(error);
  }
}
