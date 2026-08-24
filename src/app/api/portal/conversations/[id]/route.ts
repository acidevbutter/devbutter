import { portalErrorResponse, portalFetchOptionalAuth } from "@/lib/portal/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conversation = await portalFetchOptionalAuth(`/conversations/${id}`);
    return Response.json(conversation);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
