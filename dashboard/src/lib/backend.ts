import { NextResponse } from "next/server";

const backendUrl = process.env.EXPRESS_API_URL ?? "http://127.0.0.1:3000";
const backendToken = process.env.BACKEND_API_TOKEN ?? "123";

export async function backendRequest(
  path: string,
  request?: Request,
): Promise<Response> {
  const url = new URL(path, backendUrl);
  url.searchParams.set("token", backendToken);

  const method = request?.method ?? "GET";
  const headers = new Headers();
  headers.set("user-agent", "PocketSchoolDashboard/1.0");
  let body: string | undefined;

  if (request && method !== "GET" && method !== "HEAD") {
    body = await request.text();
    headers.set("content-type", request.headers.get("content-type") ?? "application/json");
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  } catch (error) {
    console.error("Could not reach the Express API:", error);
    return NextResponse.json(
      { message: "Could not reach the Express API. Check that the backend is running." },
      { status: 502 },
    );
  }

  const responseBody = backendResponse.status === 204
    ? null
    : await backendResponse.text();
  const contentType = backendResponse.headers.get("content-type") ?? "";

  if (responseBody !== null && !contentType.includes("application/json")) {
    return NextResponse.json(
      {
        message: `Express API returned a non-JSON response (HTTP ${backendResponse.status}). Restart the Express server so it loads the latest dashboard routes.`,
      },
      { status: 502 },
    );
  }

  return new Response(responseBody, {
    status: backendResponse.status,
    headers: {
      "content-type": contentType || "application/json",
    },
  });
}
