import "server-only";
import type { AccountRead } from "@/lib/admin/types";
import { portalFetch, PortalUnauthenticatedError } from "./api";
import type { PortalAccount, PortalSession } from "./types";

export { PortalUnauthenticatedError };

export async function getPortalAccount(): Promise<PortalAccount> {
  const account = await portalFetch<AccountRead>("/accounts/me");
  return {
    name: account.name,
    email: account.email,
    businessName: account.business_name,
    document: account.document,
    phone: account.phone,
    // AccountRead currently has no address field.
    address: null,
  };
}

export async function getPortalSession(): Promise<PortalSession> {
  const account = await getPortalAccount();
  return {
    name: account.name,
    email: account.email,
    businessName: account.businessName,
  };
}
