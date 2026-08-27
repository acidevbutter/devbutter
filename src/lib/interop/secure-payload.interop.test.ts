// Cross-runtime interop test for F06-05 (payment-tokenization security review).
//
// Closes: "interoperabilidade não foi comprovada por vetor TS -> Python" --
// this is the complementary direction to
// devbutter_backend/tests/test_secure_payload_interop.py (TS encrypts,
// Python decrypts). Here: Python's real encrypt_payload() is invoked as a
// subprocess (via devbutter_backend/scripts/interop/secure_payload_encrypt_cli.py,
// a thin stdin/stdout adapter around the unmodified secure_payload.py -- no
// crypto or AAD logic is reimplemented there), and its exact envelope is fed
// into two independent TypeScript-side checks:
//
//   1. referenceDecrypt() (./reference-decrypt.ts, test-only -- see that
//      file's header for why secure-payload.ts itself has no decrypt to
//      call) actually decrypts what Python produced using crypto.subtle
//      AES-GCM, proving the ciphertext/tag/AAD are cross-runtime compatible
//      at the AEAD level.
//   2. This repo's REAL, unmodified encryptPayload() is called with the
//      identical inputs and asserted byte-identical to Python's output.
//      Because AES-GCM is deterministic given the same key/nonce/plaintext/
//      AAD, byte-identical ciphertext+tag is a strictly stronger proof of
//      agreement than round-tripping: it proves both implementations
//      compute the exact same keystream and the exact same authentication
//      tag from the exact same AAD bytes, not merely that one can be
//      coaxed into accepting the other's output.
//
// Run:
//   yarn test src/lib/interop/secure-payload.interop.test.ts
// (also collected automatically by `yarn test`.)
//
// Requires a Python interpreter for the sibling devbutter_backend checkout
// (the repo's own .venv, or `poetry run python` as a fallback) with the
// `cryptography` package installed; skipped with a clear reason if neither
// is available so the rest of the frontend suite is unaffected by backend
// toolchain availability.

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { encryptPayload, importBase64UrlKey } from "../secure-payload.ts";
import { importDecryptKey, referenceDecrypt, tamperB64url, type SecureEnvelopeV1 } from "./reference-decrypt.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(HERE, "../../../../devbutter_backend");
const PYTHON_CLI = path.join(BACKEND_DIR, "scripts", "interop", "secure_payload_encrypt_cli.py");
const VENV_PYTHON = path.join(BACKEND_DIR, ".venv", "bin", "python");

function resolvePython(): { command: string; args: string[] } | null {
  if (!existsSync(PYTHON_CLI)) return null;
  if (existsSync(VENV_PYTHON)) return { command: VENV_PYTHON, args: [PYTHON_CLI] };
  const poetryCheck = spawnSync("poetry", ["--version"], { cwd: BACKEND_DIR });
  if (poetryCheck.status === 0) return { command: "poetry", args: ["run", "python", PYTHON_CLI] };
  return null;
}

const PYTHON = resolvePython();

// Fixed, fictional, 32-byte key -- base64url(bytes(range(32))). Never a real
// secret; deliberately deterministic so this vector is reproducible and
// reviewable, matching the value used in the Python-side interop test.
const TEST_KEY_B64 = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
const TEST_KEY_BYTES = Uint8Array.from({ length: 32 }, (_, i) => i);
const TEST_NONCE_B64 = "AAECAwQFBgcICQoL";
const TEST_NONCE_BYTES = Uint8Array.from({ length: 12 }, (_, i) => i);

type EncryptRequest = {
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

function pythonEncrypt(request: EncryptRequest): SecureEnvelopeV1 {
  if (!PYTHON) throw new Error("python interpreter unavailable");
  const result = spawnSync(PYTHON.command, PYTHON.args, {
    input: JSON.stringify(request),
    encoding: "utf-8",
    cwd: BACKEND_DIR,
  });
  if (result.status !== 0) {
    throw new Error(`Python encrypt CLI failed (exit ${result.status}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as SecureEnvelopeV1;
}

function baseRequest(overrides: Partial<EncryptRequest> = {}): EncryptRequest {
  return {
    keyB64: TEST_KEY_B64,
    kid: "interop-test-key-0001",
    contextId: "secctx_interop_test_0001",
    purpose: "payment_method.create",
    method: "POST",
    path: "/payment-methods",
    nonceB64: TEST_NONCE_B64,
    requestId: randomUUID(),
    timestamp: 1_700_000_000,
    payload: { cardholder: "Interop Test", month: 12, year: 2031 },
    ...overrides,
  };
}

describe.skipIf(PYTHON === null)("secure-payload cross-runtime interop (Python -> TypeScript)", () => {
  it("Python encrypts, TypeScript (reference AES-GCM decrypt) decrypts the same envelope", async () => {
    const req = baseRequest();
    const envelope = pythonEncrypt(req);

    const decryptKey = await importDecryptKey(TEST_KEY_BYTES);
    const plaintext = await referenceDecrypt(envelope, decryptKey, req.method, req.path);

    expect(plaintext).toEqual(req.payload);
  });

  it("Python's output reproduces the frozen contract vector (sec 12)", () => {
    const envelope = pythonEncrypt({
      keyB64: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      kid: "test-key-0001",
      contextId: "secctx_test_0001",
      purpose: "payment_method.create",
      method: "POST",
      path: "/payment-methods",
      nonceB64: "AAAAAAAAAAAAAAAA",
      requestId: "00000000-0000-4000-8000-000000000001",
      timestamp: 1_700_000_000,
      payload: { sample: "fictional-card-payload" },
    });

    expect(envelope.ciphertext).toBe("tYUzXCAQBwsldOe105DpcR0OYqYaxUsGtY-F7wxqWu-5aMw");
    expect(envelope.tag).toBe("OXsza2XKq4T6_XTh3c0KxA");
  });

  it("TypeScript's own real encryptPayload() is byte-identical to Python's output for the same inputs", async () => {
    const req = baseRequest();
    const pythonEnvelope = pythonEncrypt(req);

    const key = await importBase64UrlKey(req.keyB64);
    const tsEnvelope = await encryptPayload(req.payload, {
      key,
      kid: req.kid,
      contextId: req.contextId,
      purpose: req.purpose,
      method: req.method,
      path: req.path,
      nonce: TEST_NONCE_BYTES,
      requestId: req.requestId,
      timestamp: req.timestamp,
    });

    // Deterministic AES-GCM: same key/nonce/plaintext/AAD must produce
    // byte-identical ciphertext and tag across implementations. This is a
    // stronger check than round-tripping -- it proves both sides compute
    // the exact same keystream and authentication tag, not just that one
    // can be made to accept the other's output.
    expect(tsEnvelope.ciphertext).toBe(pythonEnvelope.ciphertext);
    expect(tsEnvelope.tag).toBe(pythonEnvelope.tag);
  });

  it("rejects a Python-encrypted envelope with a tampered tag", async () => {
    const req = baseRequest();
    const envelope = pythonEncrypt(req);
    envelope.tag = tamperB64url(envelope.tag);

    const decryptKey = await importDecryptKey(TEST_KEY_BYTES);
    await expect(referenceDecrypt(envelope, decryptKey, req.method, req.path)).rejects.toThrow();
  });

  it("rejects a Python-encrypted envelope with a tampered ciphertext", async () => {
    const req = baseRequest();
    const envelope = pythonEncrypt(req);
    envelope.ciphertext = tamperB64url(envelope.ciphertext);

    const decryptKey = await importDecryptKey(TEST_KEY_BYTES);
    await expect(referenceDecrypt(envelope, decryptKey, req.method, req.path)).rejects.toThrow();
  });

  it("rejects a Python-encrypted envelope decrypted against the wrong AAD path", async () => {
    // AAD binds `path` (contract sec 5); a route mismatch must fail
    // authentication -- this proves the AAD's route-binding field is built
    // identically by both implementations, not just accepted by coincidence.
    const req = baseRequest();
    const envelope = pythonEncrypt(req);

    const decryptKey = await importDecryptKey(TEST_KEY_BYTES);
    await expect(referenceDecrypt(envelope, decryptKey, req.method, "/payments")).rejects.toThrow();
  });

  // Note: `ts` clock-skew rejection (contract sec 7) is enforced inside
  // Python's decrypt_payload(), not by the raw AEAD primitive -- there is no
  // TypeScript-side implementation of that check to validate here (the
  // browser never decrypts in production; see reference-decrypt.ts header).
  // It is already exercised cross-runtime in
  // devbutter_backend/tests/test_secure_payload_interop.py, which feeds a
  // real TS-produced envelope into Python's real decrypt_payload() with a
  // timestamp outside the +/-300s window.
});
