import { describe, expect, it } from "vitest";
import { describePayment } from "./payment-label";

describe("describePayment", () => {
  it("labels a PIX charge as Pix even without a copia-e-cola code", () => {
    expect(describePayment("PIX", null, true)).toEqual({
      method: "Pix",
      linkLabel: "abrir cobrança Pix →",
    });
  });

  it("keeps the boleto wording only for BOLETO", () => {
    expect(describePayment("BOLETO", null, true)).toEqual({
      method: "Boleto",
      linkLabel: "baixar boleto (PDF) →",
    });
  });

  it("does not offer a link label for PIX when the code is shown", () => {
    expect(describePayment("PIX", "000201...", true).linkLabel).toBeNull();
  });

  it("never calls an untyped legacy charge a boleto", () => {
    expect(describePayment(null, null, true)).toEqual({
      method: "Cobrança",
      linkLabel: "abrir cobrança →",
    });
    expect(describePayment("UNDEFINED", "000201...", false).method).toBe("Pix");
  });

  it("labels card charges", () => {
    expect(describePayment("CREDIT_CARD", null, true).method).toBe("Cartão");
  });
});
