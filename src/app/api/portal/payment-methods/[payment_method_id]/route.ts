import { portalErrorResponse, portalFetch } from "@/lib/portal/api";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ payment_method_id: string }> },
) {
  const { payment_method_id } = await params;
  if (!payment_method_id) return Response.json({ error: "invalid_payment_method_id" }, { status: 400 });

  try {
    await portalFetch(`/payment-methods/${encodeURIComponent(payment_method_id)}`, {
      method: "DELETE",
      parseJson: false,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return portalErrorResponse(error);
  }
}
