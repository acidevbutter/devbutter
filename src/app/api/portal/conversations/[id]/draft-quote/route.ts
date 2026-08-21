import { portalErrorResponse, portalFetch } from "@/lib/portal/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quote = await portalFetch(`/conversations/${id}/draft-quote`, { method: "POST" });
    return Response.json(quote, { status: 201 });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
