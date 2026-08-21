/**
 * Reads a JWT's `exp` claim without verifying its signature. Signature
 * verification is the backend's job on every request; this is only a
 * freshness heuristic proxy.ts uses to decide whether to refresh proactively.
 */
export function decodeJwtExpirySeconds(token: string): number | null {
  const payloadSegment = token.split(".")[1];
  if (!payloadSegment) return null;

  try {
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isJwtExpiringSoon(token: string, thresholdSeconds = 60): boolean {
  const exp = decodeJwtExpirySeconds(token);
  if (exp === null) return true;
  return exp * 1000 - Date.now() < thresholdSeconds * 1000;
}
