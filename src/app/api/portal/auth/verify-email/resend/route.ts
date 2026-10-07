import { notImplemented } from "@/lib/portal/bff-errors";

// TODO(backend): POST /accounts/verify-email/resend {email} → 202 (always,
// like /accounts/password-recovery, so it can't be used to probe which
// e-mails have accounts; rate-limited per e-mail). Today signup returns a
// TokenPair and the account is active right away — there is no
// verification e-mail to resend. Once the endpoint exists, forward `{ email }`
// here and answer 200 `{ ok: true }` on 202.
export async function POST() {
  return notImplemented("POST /accounts/verify-email/resend {email} → 202");
}
