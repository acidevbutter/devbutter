import "server-only";
import { cookies } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "./config";
import { mockAccount } from "./mock/data";
import type { PortalAccount, PortalSession } from "./types";

export class PortalUnauthenticatedError extends Error {
  constructor() {
    super("No portal session — redirect to /portal/login");
  }
}

function encodeSession(session: PortalSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function decodeSession(raw: string): PortalSession | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed?.email === "string" && typeof parsed?.name === "string") {
      return { name: parsed.name, email: parsed.email, businessName: parsed.businessName ?? null };
    }
  } catch {
    // fall through
  }
  return null;
}

export async function createPortalSessionCookieValue(session: PortalSession): Promise<string> {
  return encodeSession(session);
}

/** Only known demo account today: mockAccount (ana@atelie-corvo.com). */
export function findMockSessionByEmail(email: string): PortalSession | null {
  if (email.trim().toLowerCase() === mockAccount.email) {
    return { name: mockAccount.name, email: mockAccount.email, businessName: mockAccount.businessName };
  }
  return null;
}

/**
 * Reads the mocked portal session cookie. Signup/login route handlers set it
 * directly; there is no backend token to refresh. Server Components/Actions
 * should let PortalUnauthenticatedError bubble to a redirect('/portal/login').
 */
export async function getPortalSession(): Promise<PortalSession> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!raw) throw new PortalUnauthenticatedError();
  const session = decodeSession(raw);
  if (!session) throw new PortalUnauthenticatedError();
  return session;
}

export async function getPortalAccount(): Promise<PortalAccount> {
  const session = await getPortalSession();
  // MOCKED: only one demo account has full profile data; anyone who signed
  // up gets the same demo business/document/phone/address as filler.
  if (session.email === mockAccount.email) return mockAccount;
  return { ...mockAccount, name: session.name, email: session.email, businessName: session.businessName };
}
