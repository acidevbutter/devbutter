import { portalErrorResponse, portalFetchOptionalAuth } from "@/lib/portal/api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const turn = await portalFetchOptionalAuth(`/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(turn);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
