import { portalErrorResponse, portalFetchOptionalAuth } from "@/lib/portal/api";
import { setConversationCookie } from "@/lib/portal/session";

export async function POST() {
  try {
    const conversation = await portalFetchOptionalAuth<{ id: string }>("/conversations", {
      method: "POST",
    });
    await setConversationCookie(conversation.id);
    return Response.json(conversation, { status: 201 });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
