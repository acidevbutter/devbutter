import { portalErrorResponse, portalFetch } from "@/lib/portal/api";

export async function GET() {
  try {
    const result = await portalFetch("/payment-methods");
    return Response.json(result);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
