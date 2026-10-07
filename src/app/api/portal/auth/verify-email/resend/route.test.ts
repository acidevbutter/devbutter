import { describe, expect, it } from "vitest";
import type { NotImplementedBody } from "@/lib/portal/bff-errors";

import { POST } from "./route";

describe("POST /api/portal/auth/verify-email/resend", () => {
  it("answers 501 with the typed not_implemented body naming the missing contract", async () => {
    const response = await POST();

    expect(response.status).toBe(501);
    const body = (await response.json()) as NotImplementedBody;
    expect(body.error).toBe("not_implemented");
    expect(body.detail).toBe("Funcionalidade ainda não disponível no backend.");
    expect(body.todo).toContain("/accounts/verify-email/resend");
  });
});
