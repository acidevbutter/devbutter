import { AdminApiError, AdminUnauthenticatedError } from "@/lib/admin/api";
import { runAdminSearch } from "@/lib/admin/services/search";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";

  try {
    const result = await runAdminSearch(q);
    return Response.json(result);
  } catch (error) {
    if (error instanceof AdminUnauthenticatedError) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (error instanceof AdminApiError) {
      return Response.json({ error: error.detail ?? "admin_api_error" }, { status: error.status });
    }
    return Response.json({ error: "upstream_failed" }, { status: 502 });
  }
}
