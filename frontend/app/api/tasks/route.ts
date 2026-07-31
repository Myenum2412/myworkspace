import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

/**
 * Proxy helper — forwards the request to the backend and streams the response.
 */
async function proxy(request: NextRequest, method: "GET" | "POST", body?: unknown) {
  const cookie = request.headers.get("cookie") || "";
  const csrfToken = request.headers.get("x-csrf-token") || "";

  const headers: Record<string, string> = { cookie };
  if (csrfToken) headers["x-csrf-token"] = csrfToken;
  if (body) headers["Content-Type"] = "application/json";

  // Forward any query params (e.g. ?limit=100&orgId=…)
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const url = qs ? `${API_URL}/api/tasks?${qs}` : `${API_URL}/api/tasks`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    return NextResponse.json(err, { status: res.status });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

/** GET /api/tasks — list tasks, forwarded to backend */
export async function GET(request: NextRequest) {
  try {
    return await proxy(request, "GET");
  } catch (err) {
    console.error("[GET /api/tasks] proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch tasks", data: [] }, { status: 500 });
  }
}

/** POST /api/tasks — create a task, forwarded to backend */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return await proxy(request, "POST", body);
  } catch (err) {
    console.error("[POST /api/tasks] proxy error:", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
