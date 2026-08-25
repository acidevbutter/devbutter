const B64URL = /^[A-Za-z0-9_-]+$/;
const KID = /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/;
const PURPOSE = /^[a-z][a-z0-9_.-]{2,63}$/;
const CONTEXT = /^secctx_[A-Za-z0-9_-]+$/;
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type SecureEnvelopeV1 = {
  v: 1;
  kid: string;
  ts: number;
  requestId: string;
  contextId: string;
  purpose: string;
  nonce: string;
  ciphertext: string;
  tag: string;
};

export type SecurePayloadOptions = {
  key: CryptoKey;
  kid: string;
  contextId: string;
  purpose: string;
  method: string;
  path: string;
  nonce: Uint8Array;
  requestId: string;
  timestamp?: number;
};

export class SecurePayloadError extends Error {
  constructor() {
    super("invalid_secure_payload");
    this.name = "SecurePayloadError";
  }
}

function b64url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function canonicalJson(value: unknown): Uint8Array {
  const json = JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
    }
    return item;
  });
  if (json === undefined) throw new SecurePayloadError();
  return new TextEncoder().encode(json);
}

function aad(options: Omit<SecurePayloadOptions, "key" | "nonce">): Uint8Array {
  if (options.path.includes("?") || !options.path.startsWith("/")) throw new SecurePayloadError();
  return canonicalJson({
    contextId: options.contextId,
    kid: options.kid,
    method: options.method.toUpperCase(),
    path: options.path,
    purpose: options.purpose,
    requestId: options.requestId,
    ts: options.timestamp,
    v: 1,
  });
}

function validateEnvelope(envelope: SecureEnvelopeV1): void {
  if (envelope.v !== 1 || !KID.test(envelope.kid) || !PURPOSE.test(envelope.purpose)) throw new SecurePayloadError();
  if (!CONTEXT.test(envelope.contextId) || !UUID4.test(envelope.requestId)) throw new SecurePayloadError();
  if (!Number.isSafeInteger(envelope.ts) || envelope.ts < 0 || envelope.ts > 253402300799) throw new SecurePayloadError();
  for (const field of [envelope.nonce, envelope.ciphertext, envelope.tag]) {
    if (!B64URL.test(field) || field.includes("=")) throw new SecurePayloadError();
  }
  if (envelope.nonce.length !== 16 || envelope.tag.length !== 22 || envelope.ciphertext.length < 2) throw new SecurePayloadError();
}

export async function importBase64UrlKey(value: string): Promise<CryptoKey> {
  if (!B64URL.test(value) || value.includes("=")) throw new SecurePayloadError();
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.length !== 32) throw new SecurePayloadError();
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt"]);
}

export async function encryptPayload(payload: Record<string, unknown>, options: SecurePayloadOptions): Promise<SecureEnvelopeV1> {
  if (options.nonce.length !== 12) throw new SecurePayloadError();
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const aadBytes = aad({ ...options, timestamp });
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(options.nonce), additionalData: asArrayBuffer(aadBytes), tagLength: 128 },
    options.key,
    asArrayBuffer(canonicalJson(payload)),
  ));
  const envelope: SecureEnvelopeV1 = {
    v: 1, kid: options.kid, ts: timestamp, requestId: options.requestId,
    contextId: options.contextId, purpose: options.purpose, nonce: b64url(options.nonce),
    ciphertext: b64url(encrypted.slice(0, -16)), tag: b64url(encrypted.slice(-16)),
  };
  validateEnvelope(envelope);
  return envelope;
}
