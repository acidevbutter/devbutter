import { portalErrorResponse, portalFetch } from "@/lib/portal/api";

export async function POST() {
  try {
    const conversation = await portalFetch("/conversations", { method: "POST" });
    return Response.json(conversation, { status: 201 });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
