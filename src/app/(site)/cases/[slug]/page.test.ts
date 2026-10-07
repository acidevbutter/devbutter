import { describe, expect, it } from "vitest";
import { CASES } from "@/content/cases";
import CaseDetailPage, { dynamicParams, generateMetadata, generateStaticParams } from "./page";

const props = (slug: string) => ({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) });

describe("/cases/[slug]", () => {
  it("prerenders exactly one page per case", () => {
    expect(generateStaticParams()).toEqual(CASES.map((c) => ({ slug: c.id })));
  });

  it("does not render unknown slugs on demand", () => {
    expect(dynamicParams).toBe(false);
  });

  it("calls notFound() for an unknown slug", async () => {
    await expect(CaseDetailPage(props("nao-existe"))).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });

  it("renders a known slug and builds its metadata", async () => {
    await expect(CaseDetailPage(props("clinica-vale"))).resolves.toBeTruthy();
    const meta = await generateMetadata(props("clinica-vale"));
    expect(meta.title).toContain("Clínica Vale");
    expect(meta.alternates?.canonical).toBe("/cases/clinica-vale");
    expect(await generateMetadata(props("nao-existe"))).toEqual({});
  });
});
