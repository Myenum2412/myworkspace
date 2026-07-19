import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookie = request.headers.get("cookie") || "";
    const csrfToken = request.headers.get("x-csrf-token") || "";
    const body = await request.json();
    
    const headers: Record<string, string> = {
      cookie,
      "Content-Type": "application/json",
    };
    if (csrfToken) headers["x-csrf-token"] = csrfToken;
    
    const res = await fetch(`${API_URL}/api/tasks/${id}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      return NextResponse.json(err, { status: res.status });
    }
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update task status" }, { status: 500 });
  }
}
