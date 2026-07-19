import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();
  try {
    const res = await fetch(`${BACKEND_URL}/api/shares/links/${token}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
