import { portalErrorResponse, portalFetch } from "@/lib/portal/api";

// GET /api/portal/recebimentos/onboarding → GET /accounts/subaccount/onboarding
export async function GET() {
  try {
    const result = await portalFetch("/accounts/subaccount/onboarding");
    return Response.json(result);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
