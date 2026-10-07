import "server-only";

import { cookies } from "next/headers";
import { API_BASE_URL, PORTAL_ACCESS_COOKIE } from "./config";

export class PortalApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : `Portal API request failed (${status})`);
    this.status = status;
    this.detail = detail;
  }
}

export class PortalUnauthenticatedError extends Error {
  constructor() {
    super("No portal access token — redirect to /portal/login");
  }
}

export function portalErrorResponse(error: unknown): Response {
  if (error instanceof PortalUnauthenticatedError) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (error instanceof PortalApiError) {
    return Response.json({ error: error.detail ?? "portal_api_error" }, { status: error.status });
  }

  console.error("portal BFF: erro inesperado", error);
  return Response.json({ error: "upstream_failed" }, { status: 502 });
}

export async function portalFetch<T>(
  path: string,
  init?: RequestInit & { parseJson?: boolean }
): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(PORTAL_ACCESS_COOKIE)?.value;

  if (!accessToken) throw new PortalUnauthenticatedError();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) throw new PortalUnauthenticatedError();

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = (await response.json())?.detail;
    } catch {
      detail = await response.text().catch(() => null);
    }
    throw new PortalApiError(response.status, detail);
  }

  if (response.status === 204 || init?.parseJson === false) return undefined as T;
  return (await response.json()) as T;
}

// Same as portalFetch, but for endpoints that accept visitors: the access
// token is attached when present, but its absence doesn't throw — the
// request just goes out unauthenticated and the backend resolves it via
// OptionalCurrentAccount (see docs/plano-onboarding-conversa-primeiro.md).
export async function portalFetchOptionalAuth<T>(
  path: string,
  init?: RequestInit & { parseJson?: boolean }
): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(PORTAL_ACCESS_COOKIE)?.value;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = (await response.json())?.detail;
    } catch {
      detail = await response.text().catch(() => null);
    }
    throw new PortalApiError(response.status, detail);
  }

  if (response.status === 204 || init?.parseJson === false) return undefined as T;
  return (await response.json()) as T;
}
