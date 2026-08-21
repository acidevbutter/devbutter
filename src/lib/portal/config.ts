// Server-only: session cookie name for the client portal (Área do Cliente).
//
// MOCKED — this portal is backed entirely by src/lib/portal/mock/data.ts, not
// devbutter_backend. The session cookie just carries a JSON blob (name/email)
// set at login/signup time, not a real JWT — there is nothing to verify
// server-side. Swap for real auth (mirror src/lib/admin/config.ts's
// access/refresh JWT cookies) once the backend contract for client-facing
// login exists.

export const PORTAL_SESSION_COOKIE = "db_portal_session";
