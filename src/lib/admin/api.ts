import "server-only";
import { cookies } from "next/headers";
import { ADMIN_ACCESS_COOKIE, API_BASE_URL } from "./config";

export class AdminApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : `Admin API request failed (${status})`);
    this.status = status;
    this.detail = detail;
  }
}

export class AdminUnauthenticatedError extends Error {
  constructor() {
    super("No admin access token — redirect to /portal/login");
  }
}

/**
 * Server-only fetch against devbutter_backend, authenticated as the current
 * admin from the httpOnly cookie proxy.ts keeps fresh. Callers (Server
 * Components, Server Actions, Route Handlers) should let AdminUnauthenticatedError
 * bubble up to a redirect('/portal/login?next=…') — proxy.ts already refreshes the
 * token on the way in, so reaching this state mid-request means the refresh
 * token itself is gone or invalid.
 */
export async function adminFetch<T>(
  path: string,
  init?: RequestInit & { parseJson?: boolean }
): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;

  if (!accessToken) {
    throw new AdminUnauthenticatedError();
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new AdminUnauthenticatedError();
  }

  if (!res.ok) {
    let detail: unknown;
    try {
      detail = (await res.json())?.detail;
    } catch {
      detail = await res.text().catch(() => null);
    }
    throw new AdminApiError(res.status, detail);
  }

  if (res.status === 204 || init?.parseJson === false) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
