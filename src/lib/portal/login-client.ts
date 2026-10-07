// Client-safe helpers shared by the account screens (`/entrar`,
// `/criar-conta`, …) and the legacy `/portal/login`. No "server-only" here:
// these run in the browser.

/** Anything with URLSearchParams' `get` — covers `useSearchParams()` too. */
type SearchParamsLike = { get(name: string): string | null };

export type LoginDestination = {
  /** Where a customer lands after logging in / signing up. */
  destination: string;
  /** Where an admin account lands after logging in. */
  adminDestination: string;
};

const QUOTE_DESTINATION = "/portal/orcamentos?new=1";

/**
 * Resolves the post-login destination from `?next=` / `?intent=quote`.
 * `next` must be a same-origin path (`/…` but not `//…`); an `/admin…` next
 * only applies to admin accounts — customers fall back to the portal.
 */
export function resolveLoginDestination(searchParams: SearchParamsLike): LoginDestination {
  const isQuoteIntent = searchParams.get("intent") === "quote";
  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
  const wantsAdmin = safeNext?.startsWith("/admin") ?? false;
  const destination = wantsAdmin
    ? isQuoteIntent
      ? QUOTE_DESTINATION
      : "/portal"
    : safeNext ?? (isQuoteIntent ? QUOTE_DESTINATION : "/portal");
  const adminDestination = wantsAdmin && safeNext ? safeNext : "/admin/dashboard";
  return { destination, adminDestination };
}

/**
 * Carries `next` / `intent` over when hopping between `/entrar` and
 * `/criar-conta`, so the destination survives the switch.
 */
export function withLoginParams(path: string, searchParams: SearchParamsLike): string {
  const carried = new URLSearchParams();
  for (const key of ["next", "intent"]) {
    const value = searchParams.get(key);
    if (value) carried.set(key, value);
  }
  const query = carried.toString();
  return query ? `${path}?${query}` : path;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface PasswordCredentialCtor {
  new (data: { id: string; password: string; name?: string }): Credential;
}

export async function offerToSaveCredential(email: string, password: string): Promise<void> {
  const PasswordCredentialImpl = (window as { PasswordCredential?: PasswordCredentialCtor })
    .PasswordCredential;
  if (!PasswordCredentialImpl || !navigator.credentials) return;
  try {
    await navigator.credentials.store(new PasswordCredentialImpl({ id: email, password, name: email }));
  } catch {
    // Saving credentials is best effort and must not interrupt authentication.
  }
}

/**
 * Chat → signup handoff. The concierge chat writes `{ name?, email? }` here
 * before sending the visitor to `/criar-conta?origem=chat`, so personal data
 * never travels in the URL.
 */
export const SIGNUP_PREFILL_KEY = "db_signup_prefill";

export type SignupPrefill = { name?: string; email?: string };

/** Reads the handoff; `{}` on the server, when absent, or when unreadable. */
export function readSignupPrefill(): SignupPrefill {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(SIGNUP_PREFILL_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const { name, email } = parsed as Record<string, unknown>;
    return {
      ...(typeof name === "string" ? { name } : {}),
      ...(typeof email === "string" ? { email } : {}),
    };
  } catch {
    // Storage blocked (private mode, sandboxed iframe) or malformed JSON.
    return {};
  }
}

export function clearSignupPrefill(): void {
  try {
    window.sessionStorage.removeItem(SIGNUP_PREFILL_KEY);
  } catch {
    // Nothing to clear when storage is blocked.
  }
}
