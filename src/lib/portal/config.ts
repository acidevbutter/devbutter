// Server-only: the portal uses the same backend as the admin, with a separate
// cookie namespace so the two sessions cannot overwrite each other.
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export const PORTAL_ACCESS_COOKIE = "db_portal_at";
export const PORTAL_REFRESH_COOKIE = "db_portal_rt";
export const PORTAL_ACCESS_TOKEN_MAX_AGE_SECONDS = 30 * 60;
export const PORTAL_REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// The Fluxo Cotação IA concierge chat's conversation id, httpOnly -- lets a
// reopened chat (public or portal) resume instead of starting over. Cleared
// once the conversation reaches draft-quote (see
// api/portal/conversations/[id]/draft-quote/route.ts) or is found
// completed/gone (see api/portal/conversations/current/route.ts).
export const CONVERSATION_ID_COOKIE = "db_conversation_id";
export const CONVERSATION_ID_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Optional `Domain=` attribute for the cookies above. Unset (host-only
// cookie) is correct for local dev, since browsers scope cookies by host,
// not port -- localhost:3000 and localhost:8000 already share one. In
// production the frontend and devbutter_backend are separate subdomains, so
// this needs to be their shared parent domain (e.g. ".devbutter.com") for
// the Socket.IO handshake's CORS-credentialed cookie read to see it -- see
// devbutter_backend's app/conversations/socket_handlers.py.
export const PORTAL_COOKIE_DOMAIN = process.env.PORTAL_COOKIE_DOMAIN || undefined;

// Client-facing: devbutter_backend's Socket.IO endpoint, used by
// NewQuoteModal for the real-time chat stream. Must be reachable directly
// from the browser (unlike API_BASE_URL, which may be an internal Docker
// network address) and must be one of devbutter_backend's cors_allowed_origins.
export const PUBLIC_SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:8002";
