import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const res = await fetch(`${API_URL}/api/files/${encodeURIComponent(id)}/duplicate`, {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") || "" },
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err) {
    console.error("[api/files/:id/duplicate] proxy error:", err);
    return NextResponse.json({ success: false, error: "Backend unavailable" }, { status: 502 });
  }
}
