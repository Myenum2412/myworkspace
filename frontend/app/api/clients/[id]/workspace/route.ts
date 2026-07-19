import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const res = await fetch(`${API_URL}/api/clients/${encodeURIComponent(id)}/workspace`, {
      headers: { cookie: req.headers.get("cookie") || "" },
      cache: "no-store",
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err) {
    console.error("[api/clients/:id/workspace] GET proxy error:", err);
    return NextResponse.json({ success: false, error: "Backend unavailable" }, { status: 502 });
  }
}
