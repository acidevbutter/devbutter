import "server-only";

import { cookies } from "next/headers";
import type { AccountRead } from "@/lib/admin/types";
import { portalFetch } from "./api";
import type { PortalAccount } from "./types";
import {
  CONVERSATION_ID_COOKIE,
  CONVERSATION_ID_MAX_AGE_SECONDS,
  PORTAL_ACCESS_COOKIE,
  PORTAL_ACCESS_TOKEN_MAX_AGE_SECONDS,
  PORTAL_COOKIE_DOMAIN,
  PORTAL_REFRESH_COOKIE,
  PORTAL_REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "./config";

function cookieBase() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(PORTAL_COOKIE_DOMAIN ? { domain: PORTAL_COOKIE_DOMAIN } : {}),
  };
}

export { PortalUnauthenticatedError } from "./api";

export async function getPortalAccount(): Promise<PortalAccount> {
  const account = await portalFetch<AccountRead>("/accounts/me");
  return {
    name: account.name,
    email: account.email,
    businessName: account.company_name || null,
    document: account.cnpj || account.cpf || null,
    phone: account.phone,
    address: null,
  };
}

export async function setPortalSessionCookies(tokens: { access_token: string; refresh_token: string }) {
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_ACCESS_COOKIE, tokens.access_token, {
    ...cookieBase(),
    maxAge: PORTAL_ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  cookieStore.set(PORTAL_REFRESH_COOKIE, tokens.refresh_token, {
    ...cookieBase(),
    maxAge: PORTAL_REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export async function setConversationCookie(conversationId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CONVERSATION_ID_COOKIE, conversationId, {
    ...cookieBase(),
    maxAge: CONVERSATION_ID_MAX_AGE_SECONDS,
  });
}

export async function clearConversationCookie() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: CONVERSATION_ID_COOKIE, ...cookieBase() });
}

export async function getConversationCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CONVERSATION_ID_COOKIE)?.value;
}
