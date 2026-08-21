// Server-only: the portal uses the same backend as the admin, with a separate
// cookie namespace so the two sessions cannot overwrite each other.
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export const PORTAL_ACCESS_COOKIE = "db_portal_at";
export const PORTAL_REFRESH_COOKIE = "db_portal_rt";
export const PORTAL_ACCESS_TOKEN_MAX_AGE_SECONDS = 30 * 60;
export const PORTAL_REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
