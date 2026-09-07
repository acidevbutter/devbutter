import "server-only";
import { portalFetch } from "../api";
import type { SubaccountCommercialInfo, SubaccountOnboarding } from "../types";

// GET /accounts/subaccount/onboarding — dimension states + pending documents.
export function getSubaccountOnboarding(): Promise<SubaccountOnboarding> {
  return portalFetch<SubaccountOnboarding>("/accounts/subaccount/onboarding");
}

// GET /accounts/subaccount/commercial-info — Asaas `commercialInfo` object,
// used to pre-fill the expiration form.
export function getSubaccountCommercialInfo(): Promise<SubaccountCommercialInfo> {
  return portalFetch<SubaccountCommercialInfo>("/accounts/subaccount/commercial-info");
}
