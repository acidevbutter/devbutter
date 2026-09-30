import { describe, expect, it } from "vitest";
import {
  formatBrMobile,
  formatCep,
  formatCnpj,
  formatCurrencyInput,
  getSubaccountFieldIssues,
  parseCurrencyDisplay,
  toCurrencyDisplay,
  type SubaccountCreatePayload,
} from "./asaas-types";

const VALID_CPF_PAYLOAD: SubaccountCreatePayload = {
  name: "Loja da Ana",
  email: "ana@example.com",
  cpfCnpj: "11144477735",
  birthDate: "1990-01-01",
  mobilePhone: "11999999999",
  incomeValue: "5000",
  address: "Rua das Flores",
  addressNumber: "100",
  province: "Centro",
  postalCode: "01310100",
};

describe("getSubaccountFieldIssues", () => {
  it("reports every required field missing on an empty payload", () => {
    const issues = getSubaccountFieldIssues({});
    const fields = issues.map((i) => i.field);

    expect(fields).toEqual(
      expect.arrayContaining([
        "name",
        "email",
        "cpfCnpj",
        "mobilePhone",
        "incomeValue",
        "address",
        "addressNumber",
        "province",
        "postalCode",
      ])
    );
    expect(issues.every((i) => i.kind === "missing")).toBe(true);
  });

  it("is empty for a fully valid CPF (individual) payload", () => {
    expect(getSubaccountFieldIssues(VALID_CPF_PAYLOAD)).toEqual([]);
  });

  it("requires birthDate (not companyType) once cpfCnpj is an 11-digit CPF", () => {
    const { birthDate, ...rest } = VALID_CPF_PAYLOAD;
    void birthDate;
    const issues = getSubaccountFieldIssues(rest);

    expect(issues).toEqual([{ field: "birthDate", label: expect.any(String), kind: "missing" }]);
  });

  it("requires companyType (not birthDate) once cpfCnpj is a 14-digit CNPJ", () => {
    const { birthDate, ...rest } = VALID_CPF_PAYLOAD;
    void birthDate;
    const cnpjPayload = { ...rest, cpfCnpj: "11222333000181" };

    const issues = getSubaccountFieldIssues(cnpjPayload);

    expect(issues).toEqual([
      { field: "companyType", label: expect.any(String), kind: "missing" },
    ]);
  });

  it("flags cpfCnpj as invalid when it isn't 11 or 14 digits", () => {
    const issues = getSubaccountFieldIssues({ ...VALID_CPF_PAYLOAD, cpfCnpj: "123" });

    expect(issues).toEqual([{ field: "cpfCnpj", label: expect.any(String), kind: "invalid" }]);
  });

  it("flags an 11-digit cpfCnpj with the right length but a bad check digit", () => {
    // Same length as a real CPF, but the check digits don't match -- a
    // fat-fingered digit Asaas would reject even though it "looks" valid.
    const issues = getSubaccountFieldIssues({ ...VALID_CPF_PAYLOAD, cpfCnpj: "11144477736" });

    expect(issues).toEqual([{ field: "cpfCnpj", label: expect.any(String), kind: "invalid" }]);
  });

  it("accepts a real checksum-valid CNPJ and requires companyType for it", () => {
    const { birthDate, ...rest } = VALID_CPF_PAYLOAD;
    void birthDate;
    const issues = getSubaccountFieldIssues({
      ...rest,
      cpfCnpj: "11222333000181",
      companyType: "LIMITED",
    });

    expect(issues).toEqual([]);
  });

  it("flags a 14-digit cpfCnpj with a bad check digit even with companyType set", () => {
    const { birthDate, ...rest } = VALID_CPF_PAYLOAD;
    void birthDate;
    const issues = getSubaccountFieldIssues({
      ...rest,
      cpfCnpj: "11222333000199",
      companyType: "LIMITED",
    });

    expect(issues).toEqual([{ field: "cpfCnpj", label: expect.any(String), kind: "invalid" }]);
  });

  it("flags an optional phone as invalid when it isn't DDD + 8-digit landline shape", () => {
    const issues = getSubaccountFieldIssues({ ...VALID_CPF_PAYLOAD, phone: "119999999" });

    expect(issues).toEqual([{ field: "phone", label: expect.any(String), kind: "invalid" }]);
  });

  it("accepts a payload with no phone/site at all (both optional)", () => {
    expect(getSubaccountFieldIssues(VALID_CPF_PAYLOAD)).toEqual([]);
  });

  it("flags an optional site as invalid when it doesn't look like a domain", () => {
    const issues = getSubaccountFieldIssues({ ...VALID_CPF_PAYLOAD, site: "not a site" });

    expect(issues).toEqual([{ field: "site", label: expect.any(String), kind: "invalid" }]);
  });

  it("accepts a site with or without an http(s) scheme", () => {
    expect(getSubaccountFieldIssues({ ...VALID_CPF_PAYLOAD, site: "www.loja.com.br" })).toEqual([]);
    expect(
      getSubaccountFieldIssues({ ...VALID_CPF_PAYLOAD, site: "https://loja.com.br" })
    ).toEqual([]);
  });

  it("flags a malformed email as invalid, not missing", () => {
    const issues = getSubaccountFieldIssues({ ...VALID_CPF_PAYLOAD, email: "not-an-email" });

    expect(issues).toEqual([{ field: "email", label: expect.any(String), kind: "invalid" }]);
  });

  it("flags postalCode as invalid unless it has exactly 8 digits", () => {
    const issues = getSubaccountFieldIssues({ ...VALID_CPF_PAYLOAD, postalCode: "0131010" });

    expect(issues).toEqual([{ field: "postalCode", label: expect.any(String), kind: "invalid" }]);
  });

  it("flags mobilePhone as invalid when it isn't DDD + 9-digit mobile shape", () => {
    // Real Asaas rejection this mirrors: "O número informado não é um
    // número móvel válido" for a 13-digit landline-shaped input.
    const issues = getSubaccountFieldIssues({ ...VALID_CPF_PAYLOAD, mobilePhone: "2123312321231" });

    expect(issues).toEqual([{ field: "mobilePhone", label: expect.any(String), kind: "invalid" }]);
  });

  it("flags incomeValue as invalid when it isn't a positive number", () => {
    const issues = getSubaccountFieldIssues({ ...VALID_CPF_PAYLOAD, incomeValue: "0" });

    expect(issues).toEqual([{ field: "incomeValue", label: expect.any(String), kind: "invalid" }]);
  });
});

describe("input masks", () => {
  it("formats a CNPJ progressively as digits come in", () => {
    expect(formatCnpj("11")).toBe("11");
    expect(formatCnpj("112223330001")).toBe("11.222.333/0001");
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("caps formatCnpj at 14 digits, ignoring anything typed past that", () => {
    expect(formatCnpj("112223330001819999")).toBe("11.222.333/0001-81");
  });

  it("formats a mobile number progressively as digits come in", () => {
    expect(formatBrMobile("11")).toBe("(11");
    expect(formatBrMobile("1199999")).toBe("(11) 99999");
    expect(formatBrMobile("11999999999")).toBe("(11) 99999-9999");
  });

  it("formats a CEP progressively as digits come in", () => {
    expect(formatCep("01310")).toBe("01310");
    expect(formatCep("01310100")).toBe("01310-100");
  });

  it("shifts typed digits in as cents, right to left", () => {
    expect(formatCurrencyInput("1")).toBe("0,01");
    expect(formatCurrencyInput("100")).toBe("1,00");
    expect(formatCurrencyInput("100000")).toBe("1.000,00");
    // The huge nonsense number from a real fat-finger/paste stays a huge
    // number, but it's capped at 13 digits (R$ 999,999,999,999.99, well
    // above any real income) instead of growing without bound.
    expect(formatCurrencyInput("21332131313133123123")).toBe("21.332.131.313,13");
  });

  it("round-trips a BR display string back into the plain decimal SubaccountCreate wants", () => {
    expect(parseCurrencyDisplay("1.000,00")).toBe("1000.00");
    expect(parseCurrencyDisplay("0,01")).toBe("0.01");
  });

  it("formats a plain decimal (e.g. from a saved billing profile) for display", () => {
    expect(toCurrencyDisplay("1000")).toBe("1.000,00");
    expect(toCurrencyDisplay("1000.5")).toBe("1.000,50");
    expect(toCurrencyDisplay(undefined)).toBe("");
  });
});
