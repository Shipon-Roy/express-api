import { keysMatch } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!process.env.DASHBOARD_ADMIN_KEY) {
    return NextResponse.json(
      { message: "Dashboard access is not configured. Set DASHBOARD_ADMIN_KEY in dashboard/.env.local." },
      { status: 503 },
    );
  }

  let body: { key?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "A valid JSON request body is required." }, { status: 400 });
  }

  if (typeof body.key !== "string" || !keysMatch(body.key)) {
    return NextResponse.json({ message: "That admin key is not correct." }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
