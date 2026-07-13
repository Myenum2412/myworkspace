import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function proxy(request: NextRequest, method: string, id: string, body?: unknown) {
  const cookie = request.headers.get("cookie") || "";
  const csrfToken = request.headers.get("x-csrf-token") || "";
  const headers: Record<string, string> = { cookie };
  if (csrfToken) headers["x-csrf-token"] = csrfToken;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    return NextResponse.json(err, { status: res.status });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await proxy(request, "DELETE", id);
  } catch {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    return await proxy(request, "PUT", id, body);
  } catch {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    return await proxy(request, "PATCH", id, body);
  } catch {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
