import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/api/shares/links/${token}`, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
      return NextResponse.json({ error: "Could not load share link" }, { status: 500 });
  }
}
