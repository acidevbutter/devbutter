import { portalErrorResponse, portalFetch } from "@/lib/portal/api";

// This route carries the opaque secure envelope (contract:
// docs/prompts/payment-tokenization/runs/07-contract-freeze.md, section
// 5.2/5.3). It must forward the request body byte-for-byte -- no
// JSON.parse/JSON.stringify round trip -- because the envelope's integrity
// is a transport concern the BFF must not touch, and because re-serializing
// parsed JSON is not guaranteed to reproduce the original bytes. The BFF
// never inspects, logs, or transforms this body.
export async function POST(request: Request) {
  const body = await request.text();
  if (!body) return Response.json({ error: "invalid_body" }, { status: 400 });

  try {
    const result = await portalFetch("/payment-methods", {
      method: "POST",
      body,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
