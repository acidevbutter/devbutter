import { cookies } from "next/headers";
import { API_BASE_URL, PORTAL_ACCESS_COOKIE } from "@/lib/portal/config";

// POST /api/portal/recebimentos/documents/{group_id} (multipart) →
// POST /accounts/subaccount/documents/{group_id}
//
// portalFetch forces a JSON Content-Type when a body is present, which breaks
// multipart boundaries — so this handler forwards the FormData by hand.

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ group_id: string }> }
) {
  const { group_id } = await params;

  const accessToken = (await cookies()).get(PORTAL_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "file_required" }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "file_too_large" }, { status: 422 });
  }
  if (file.type && !ACCEPTED_MIME.has(file.type)) {
    return Response.json({ error: "unsupported_media_type" }, { status: 422 });
  }

  const upstream = new FormData();
  upstream.append("file", file, file.name || "documento");

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE_URL}/accounts/subaccount/documents/${encodeURIComponent(group_id)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: upstream,
        cache: "no-store",
      }
    );
  } catch {
    return Response.json({ error: "upstream_failed" }, { status: 502 });
  }

  if (res.status === 401) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const text = await res.text();
  return new Response(text || null, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
