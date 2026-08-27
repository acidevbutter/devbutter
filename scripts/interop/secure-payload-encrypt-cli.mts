// Cross-runtime interop helper for F06-05 (payment-tokenization security
// review). NOT part of the application build; only invoked as a subprocess
// by backend interop tests (devbutter_backend/tests/test_secure_payload_interop.py)
// and by the frontend interop test (../../src/lib/interop/secure-payload.interop.test.ts).
//
// It imports the real, unmodified secure-payload.ts module and drives its
// real encryptPayload() — this is a thin I/O adapter, not a reimplementation
// of any crypto or AAD logic. That keeps the interop proof honest: whatever
// envelope comes out of this script is byte-for-byte what the browser would
// produce, because it *is* the browser's encryptPayload().
//
// Protocol: read one JSON object from stdin, write one JSON envelope (or an
// error) to stdout, exit 0/1.
//
// Input shape:
// {
//   "keyB64": string,      // base64url, 32 bytes, no padding
//   "kid": string,
//   "contextId": string,
//   "purpose": string,
//   "method": string,
//   "path": string,
//   "nonceB64": string,    // base64url, 12 bytes, no padding
//   "requestId": string,
//   "timestamp": number,   // unix seconds
//   "payload": object      // plaintext to encrypt
// }
//
// Run manually:
//   echo '{"keyB64":"...","kid":"...", ...}' | node scripts/interop/secure-payload-encrypt-cli.mts

import { readFileSync } from "node:fs";
import { encryptPayload, importBase64UrlKey } from "../../src/lib/secure-payload.ts";

function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function main() {
  const raw = readFileSync(0, "utf-8");
  const request = JSON.parse(raw) as {
    keyB64: string;
    kid: string;
    contextId: string;
    purpose: string;
    method: string;
    path: string;
    nonceB64: string;
    requestId: string;
    timestamp: number;
    payload: Record<string, unknown>;
  };

  const key = await importBase64UrlKey(request.keyB64);
  const nonce = b64urlToBytes(request.nonceB64);

  const envelope = await encryptPayload(request.payload, {
    key,
    kid: request.kid,
    contextId: request.contextId,
    purpose: request.purpose,
    method: request.method,
    path: request.path,
    nonce,
    requestId: request.requestId,
    timestamp: request.timestamp,
  });

  process.stdout.write(JSON.stringify(envelope));
}

main().catch((error) => {
  process.stderr.write(String(error?.stack ?? error));
  process.exit(1);
});
