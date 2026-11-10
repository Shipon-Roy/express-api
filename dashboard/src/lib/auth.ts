import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function dashboardKeyError(request: Request): Response | null {
  const expectedKey = process.env.DASHBOARD_ADMIN_KEY;
  if (!expectedKey) {
    return NextResponse.json(
      { message: "Dashboard access is not configured. Set DASHBOARD_ADMIN_KEY in dashboard/.env.local." },
      { status: 503 },
    );
  }

  const suppliedKey = request.headers.get("x-dashboard-key");
  if (!suppliedKey || !keysMatch(suppliedKey, expectedKey)) {
    return NextResponse.json({ message: "Admin access denied. Please sign in again." }, { status: 401 });
  }

  return null;
}

export function keysMatch(suppliedKey: string, expectedKey = process.env.DASHBOARD_ADMIN_KEY): boolean {
  if (!expectedKey) return false;
  const suppliedBuffer = Buffer.from(suppliedKey);
  const expectedBuffer = Buffer.from(expectedKey);
  return suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer);
}
