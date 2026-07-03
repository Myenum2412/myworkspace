import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
  const cookie = req.headers.get("cookie") || "";

  try {
    const res = await fetch(`${backendUrl}/api/dashboard/profit-loss`, {
      headers: { cookie },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to connect to backend" },
      { status: 502 }
    );
  }
}
