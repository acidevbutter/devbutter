import { portalErrorResponse, portalFetch } from "@/lib/portal/api";

// POST /api/portal/recebimentos/resend-activation → POST /accounts/subaccount/resend-activation
// No body. Asaas allows a single resend of the activation e-mail.
export async function POST() {
  try {
    await portalFetch("/accounts/subaccount/resend-activation", {
      method: "POST",
      parseJson: false,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
