// Server-only: never import this from a "use client" file. The backend base
// URL and token cookies stay off the client bundle on purpose (see the BFF
// auth design in docs/admin-api-contracts.md's surrounding plan).

export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export const ADMIN_ACCESS_COOKIE = "db_admin_at";
export const ADMIN_REFRESH_COOKIE = "db_admin_rt";

// Matches app/settings/config.py: jwt_access_token_expire_minutes = 30.
export const ADMIN_ACCESS_TOKEN_MAX_AGE_SECONDS = 30 * 60;
// Matches app/settings/config.py: jwt_refresh_token_expire_days = 30.
export const ADMIN_REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
