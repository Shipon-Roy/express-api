import { backendRequest } from "@/lib/backend";
import { dashboardKeyError } from "@/lib/auth";

export function GET(request: Request) {
  const error = dashboardKeyError(request);
  if (error) return error;
  return backendRequest("/api/admin/analytics");
}
