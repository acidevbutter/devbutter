// TEST-ONLY reference decryptor for the v1 secure envelope, used exclusively
// by the F06-05 cross-runtime interop test
// (secure-payload.interop.test.ts). No application code imports this file.
//
// secure-payload.ts intentionally exports no decrypt function: per the
// contract (docs/prompts/payment-tokenization/runs/02-crypto-contract.md,
// docs/prompts/payment-tokenization/runs/07-contract-freeze.md sec 0), the
// browser only ever encrypts -- only the backend decrypts. To genuinely
// prove "Python encrypts, TypeScript decrypts" for interop purposes, this
// module decrypts using the same primitive encryptPayload() uses
// (crypto.subtle, AES-GCM) and the same frozen 8-field AAD contract, applied
// here in plain, read-only form for verification. It does not import from,
// wrap, or otherwise reuse secure-payload.ts's internal aad()/canonicalJson()
// -- it is an independent construction of the same publicly documented
// format, which is the point: if this independently-built AAD does not
// authenticate against what the Python encrypter produced, that is a real
// interop bug, not a shared-bug blind spot.
//
// This file must never diverge from the frozen AAD contract on its own
// initiative; if the contract changes, this file changes with it, exactly
// as secure-payload.ts and secure_payload.py must.

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

function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** Test-only helper: re-encode bytes as base64url (no padding), for building
 * tampered vectors at the byte level rather than the base64-character level
 * (mutating a trailing base64 character can land on padding bits that carry
 * no decoded data, which would silently produce a non-tamper).
 */
export function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/** Test-only helper: flip one bit in the decoded bytes of a base64url field
 * and re-encode. Used by interop negative vectors to guarantee an actual
 * ciphertext/tag mutation, regardless of base64 padding-bit quirks.
 */
export function tamperB64url(value: string): string {
  const bytes = b64urlToBytes(value);
  bytes[0] = bytes[0] ^ 0xff;
  return bytesToB64url(bytes);
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/** Builds the AAD bytes per the frozen 8-field contract (sec 5 of the crypto
 * contract). Field order is already alphabetical -- RFC 8785 canonical order
 * for this fixed field set -- so a plain JSON.stringify of an object built
 * in this order matches the canonical serialization without needing a
 * general-purpose canonicalizer.
 */
function referenceAad(params: {
  contextId: string;
  kid: string;
  method: string;
  path: string;
  purpose: string;
  requestId: string;
  ts: number;
}): Uint8Array {
  const json = JSON.stringify({
    contextId: params.contextId,
    kid: params.kid,
    method: params.method.toUpperCase(),
    path: params.path,
    purpose: params.purpose,
    requestId: params.requestId,
    ts: params.ts,
    v: 1,
  });
  return new TextEncoder().encode(json);
}

export async function referenceDecrypt(
  envelope: SecureEnvelopeV1,
  key: CryptoKey,
  expectedMethod: string,
  expectedPath: string,
): Promise<Record<string, unknown>> {
  const nonce = b64urlToBytes(envelope.nonce);
  const ciphertext = b64urlToBytes(envelope.ciphertext);
  const tag = b64urlToBytes(envelope.tag);
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const aad = referenceAad({
    contextId: envelope.contextId,
    kid: envelope.kid,
    method: expectedMethod,
    path: expectedPath,
    purpose: envelope.purpose,
    requestId: envelope.requestId,
    ts: envelope.ts,
  });

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asArrayBuffer(nonce), additionalData: asArrayBuffer(aad), tagLength: 128 },
    key,
    asArrayBuffer(combined),
  );
  const text = new TextDecoder("utf-8", { fatal: true }).decode(plaintextBuffer);
  return JSON.parse(text) as Record<string, unknown>;
}

export async function importDecryptKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", asArrayBuffer(rawKey), "AES-GCM", false, ["decrypt"]);
}
