import { portalErrorResponse, portalFetch } from "@/lib/portal/api";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const result = await portalFetch("/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return Response.json(result, { status: 202 });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
