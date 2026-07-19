import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookie = request.headers.get("cookie") || "";
    const csrfToken = request.headers.get("x-csrf-token") || "";
    const headers: Record<string, string> = { cookie, "Content-Type": "application/json" };
    if (csrfToken) headers["x-csrf-token"] = csrfToken;

    const body = await request.json().catch(() => ({}));

    const res = await fetch(`${API_URL}/api/file-approval/${id}/reject`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Reject failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to reject file" }, { status: 500 });
  }
}
