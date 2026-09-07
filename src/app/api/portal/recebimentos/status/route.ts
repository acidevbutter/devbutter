import { portalErrorResponse, portalFetch } from "@/lib/portal/api";
import type { AccountRead } from "@/lib/admin/types";
import type { RecebimentosStatus, SubaccountOnboarding } from "@/lib/portal/types";

// GET /api/portal/recebimentos/status — one payload for the client poll: the
// gate flag + subaccount status from /accounts/me and the onboarding detail.
export async function GET() {
  try {
    const [me, onboarding] = await Promise.all([
      portalFetch<AccountRead>("/accounts/me"),
      portalFetch<SubaccountOnboarding>("/accounts/subaccount/onboarding").catch(() => null),
    ]);

    const body: RecebimentosStatus = {
      onboarding_required: me.onboarding_required ?? false,
      subaccount_status: me.subaccount_status ?? null,
      onboarding,
    };
    return Response.json(body);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
