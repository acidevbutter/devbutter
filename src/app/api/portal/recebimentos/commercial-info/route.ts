import { portalErrorResponse, portalFetch } from "@/lib/portal/api";

// GET /api/portal/recebimentos/commercial-info → GET /accounts/subaccount/commercial-info
export async function GET() {
  try {
    const result = await portalFetch("/accounts/subaccount/commercial-info");
    return Response.json(result);
  } catch (error) {
    return portalErrorResponse(error);
  }
}

// POST → POST /accounts/subaccount/commercial-info (backend validates; the
// portal only forwards the confirmed fields, `incomeValue` always included).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await portalFetch("/accounts/subaccount/commercial-info", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return Response.json(result);
  } catch (error) {
    return portalErrorResponse(error);
  }
}
