import { portalErrorResponse, portalFetchOptionalAuth } from "@/lib/portal/api";

// ADR-0004: merge the collecting-step business-profile fields.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const turn = await portalFetchOptionalAuth(`/conversations/${id}/business-profile`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return Response.json(turn);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
