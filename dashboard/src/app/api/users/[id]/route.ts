import { backendRequest } from "@/lib/backend";
import { dashboardKeyError } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const error = dashboardKeyError(request);
  if (error) return error;
  const { id } = await context.params;
  return backendRequest(`/api/admin/users/${encodeURIComponent(id)}`, request);
}

export async function DELETE(request: Request, context: RouteContext) {
  const error = dashboardKeyError(request);
  if (error) return error;
  const { id } = await context.params;
  return backendRequest(`/api/admin/users/${encodeURIComponent(id)}`, request);
}
