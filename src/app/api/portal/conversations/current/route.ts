import { redactPrices } from "@/lib/portal/redact";
import { PortalApiError, portalFetchOptionalAuth } from "@/lib/portal/api";
import { clearConversationCookie, getConversationCookie } from "@/lib/portal/session";

type ConversationRead = {
  id: string;
  account_id: string | null;
  status: string;
  transcript: { role: string; content: string }[];
  ready_to_submit: boolean;
  draft_preview: {
    problem_summary: string;
    services_of_interest: string[];
    budget_range: string | null;
    timeline: string | null;
    missing_information: string[];
    grounding_status: string;
    // Live qualification state for canvas 1c (chip row + "X de N perguntas").
    // Optional: a preview persisted before this field existed omits it.
    business_profile?: {
      company_name: string | null;
      is_legal_entity: boolean | null;
      segment: string | null;
      volume: string | null;
      pain_points: string[];
      scope_modules: string[];
      contact_ready: boolean;
    } | null;
    progress?: { answered: number; total: number } | null;
  } | null;
  created_at: string;
};

// Resolves the resumable conversation for this browser, if any -- backs
// NewQuoteModal's resume-on-mount check. A conversation that's gone
// (deleted/reassigned) or already `completed` (submitted via draft-quote)
// doesn't count as resumable: the next chat open should start fresh.
export async function GET() {
  const conversationId = await getConversationCookie();
  if (!conversationId) {
    return Response.json({ conversation: null });
  }

  try {
    const conversation = await portalFetchOptionalAuth<ConversationRead>(
      `/conversations/${conversationId}`
    );
    if (conversation.status === "completed") {
      await clearConversationCookie();
      return Response.json({ conversation: null });
    }
    return Response.json({ conversation: redactPrices(conversation) });
  } catch (error) {
    if (error instanceof PortalApiError && error.status === 404) {
      await clearConversationCookie();
      return Response.json({ conversation: null });
    }
    return Response.json({ conversation: null });
  }
}
