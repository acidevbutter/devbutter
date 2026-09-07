import { describe, expect, it } from "vitest";
import { deriveRecebimentosState, deriveRecebimentosView } from "./recebimentos-state";
import type { SubaccountOnboarding, SubaccountStatusRead } from "./types";

function sub(overrides: Partial<SubaccountStatusRead> = {}): SubaccountStatusRead {
  return {
    provisioning_status: "PROVISIONED",
    onboarding_status: null,
    approval_status: "PENDING",
    commercial_info_status: null,
    bank_account_info_status: null,
    documentation_status: null,
    commercial_info_expires_at: null,
    last_error: null,
    ...overrides,
  };
}

function onboarding(overrides: Partial<SubaccountOnboarding> = {}): SubaccountOnboarding {
  return {
    state: "AWAITING_ONBOARDING",
    general: "PENDING",
    commercialInfo: "PENDING",
    bankAccountInfo: "PENDING",
    documentation: "PENDING",
    pending_documents: [],
    onboarding_url: null,
    ...overrides,
  };
}

describe("deriveRecebimentosState", () => {
  it("is not_provisioned when there is no subaccount", () => {
    expect(deriveRecebimentosState(null, null)).toBe("not_provisioned");
    expect(
      deriveRecebimentosState(sub({ provisioning_status: "NONE" }), onboarding({ state: "not_provisioned" }))
    ).toBe("not_provisioned");
  });

  it("is AWAITING_ONBOARDING once provisioned but still syncing", () => {
    expect(
      deriveRecebimentosState(
        sub({ onboarding_status: "AWAITING_ONBOARDING" }),
        onboarding({ state: "AWAITING_ONBOARDING" })
      )
    ).toBe("AWAITING_ONBOARDING");
  });

  it("is PENDING_DOCUMENTS when documents are pending", () => {
    expect(
      deriveRecebimentosState(
        sub(),
        onboarding({
          state: "PENDING_DOCUMENTS",
          pending_documents: [
            { id: "grp_abc", type: "IDENTIFICATION", status: "PENDING", title: "Doc", onboardingUrl: null },
          ],
        })
      )
    ).toBe("PENDING_DOCUMENTS");
  });

  it("is UNDER_REVIEW when approval is awaiting", () => {
    expect(
      deriveRecebimentosState(sub({ approval_status: "AWAITING_APPROVAL" }), onboarding({ state: "UNDER_REVIEW" }))
    ).toBe("UNDER_REVIEW");
  });

  it("is REJECTED on rejected approval or a rejected document", () => {
    expect(deriveRecebimentosState(sub({ approval_status: "REJECTED" }), null)).toBe("REJECTED");
    expect(
      deriveRecebimentosState(
        sub(),
        onboarding({
          pending_documents: [
            { id: "g", type: "IDENTIFICATION", status: "REJECTED", title: "Doc", onboardingUrl: null },
          ],
        })
      )
    ).toBe("REJECTED");
  });

  it("is APPROVED when approval is approved and nothing is expiring", () => {
    expect(deriveRecebimentosState(sub({ approval_status: "APPROVED" }), onboarding({ state: "APPROVED" }))).toBe(
      "APPROVED"
    );
  });

  it("is COMMERCIAL_INFO_EXPIRING when approved with a future expiry", () => {
    const future = new Date(Date.now() + 7 * 864e5).toISOString();
    expect(
      deriveRecebimentosState(
        sub({ approval_status: "APPROVED", commercial_info_expires_at: future }),
        onboarding({ state: "APPROVED" })
      )
    ).toBe("COMMERCIAL_INFO_EXPIRING");
  });

  it("is COMMERCIAL_INFO_EXPIRED on an expired status or restricted provisioning", () => {
    expect(
      deriveRecebimentosState(sub({ approval_status: "APPROVED", commercial_info_status: "EXPIRED" }), null)
    ).toBe("COMMERCIAL_INFO_EXPIRED");
    expect(deriveRecebimentosState(sub({ provisioning_status: "RESTRICTED" }), null)).toBe(
      "COMMERCIAL_INFO_EXPIRED"
    );
  });

  it("is CREATION_FAILED / CLOSED from provisioning_status", () => {
    expect(deriveRecebimentosState(sub({ provisioning_status: "CREATION_FAILED" }), null)).toBe(
      "CREATION_FAILED"
    );
    expect(deriveRecebimentosState(sub({ provisioning_status: "CLOSED" }), null)).toBe("CLOSED");
  });
});

describe("deriveRecebimentosView", () => {
  it("gates the portal for the unfinished states only", () => {
    expect(deriveRecebimentosView(sub({ approval_status: "APPROVED" }), onboarding({ state: "APPROVED" })).gated).toBe(
      false
    );
    expect(
      deriveRecebimentosView(sub({ onboarding_status: "AWAITING_ONBOARDING" }), onboarding()).gated
    ).toBe(true);
  });

  it("derives step statuses from the onboarding dimensions when present", () => {
    const view = deriveRecebimentosView(
      sub(),
      onboarding({
        state: "PENDING_DOCUMENTS",
        commercialInfo: "APPROVED",
        bankAccountInfo: "APPROVED",
        documentation: "PENDING",
        general: "PENDING",
        pending_documents: [
          { id: "g", type: "IDENTIFICATION", status: "PENDING", title: "Doc", onboardingUrl: null },
        ],
      })
    );
    expect(view.steps.map((s) => s.status)).toEqual(["ok", "ok", "action", "pending"]);
  });

  it("polls only while AWAITING_ONBOARDING", () => {
    expect(deriveRecebimentosView(sub({ onboarding_status: "AWAITING_ONBOARDING" }), onboarding()).polling).toBe(
      true
    );
    expect(
      deriveRecebimentosView(sub({ approval_status: "APPROVED" }), onboarding({ state: "APPROVED" })).polling
    ).toBe(false);
  });
});
