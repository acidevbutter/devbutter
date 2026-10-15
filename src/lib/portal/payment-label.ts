// What to call a charge in the portal. Driven by the Asaas billingType the
// backend now persists (DVB-381); the old guess ("no pix code => boleto")
// labeled every PIX charge without a copia-e-cola code as a boleto.
export type PaymentView = { method: string; linkLabel: string | null };

export function describePayment(
  billingType: string | null | undefined,
  pixCode: string | null,
  hasLink: boolean
): PaymentView {
  switch (billingType) {
    case "PIX":
      return { method: "Pix", linkLabel: hasLink && !pixCode ? "abrir cobrança Pix →" : null };
    case "BOLETO":
      return { method: "Boleto", linkLabel: hasLink ? "baixar boleto (PDF) →" : null };
    case "CREDIT_CARD":
      return { method: "Cartão", linkLabel: hasLink ? "abrir cobrança →" : null };
    default:
      // UNDEFINED or a legacy invoice with no stored type: never claim "boleto".
      return {
        method: pixCode ? "Pix" : "Cobrança",
        linkLabel: hasLink ? "abrir cobrança →" : null,
      };
  }
}
