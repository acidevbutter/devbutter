// Shared types + client helper for the admin global search. The server-side
// fan-out lives in services/search.ts (server-only); this file is safe to
// import from client components.

export interface AdminSearchItem {
  label: string;
  sub: string;
  href: string;
}

export interface AdminSearchGroup {
  group: string;
  items: AdminSearchItem[];
}

export interface AdminSearchResponse {
  groups: AdminSearchGroup[];
}

export async function searchAdmin(
  query: string,
  signal?: AbortSignal
): Promise<AdminSearchResponse> {
  const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, {
    cache: "no-store",
    signal,
  });
  if (!res.ok) throw new Error("admin_search_failed");
  return (await res.json()) as AdminSearchResponse;
}
