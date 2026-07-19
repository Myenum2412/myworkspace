import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const headers: HeadersInit = {};
    const cookie = req.headers.get("cookie");
    if (cookie) headers.cookie = cookie;
    const csrf = req.headers.get("x-csrf-token");
    if (csrf) headers["x-csrf-token"] = csrf;
    const auth = req.headers.get("authorization");
    if (auth) headers.authorization = auth;
    if (contentType) headers["content-type"] = contentType;

    const body = await req.arrayBuffer();
    const res = await fetch(`${API_URL}/api/files/upload`, {
      method: "POST",
      headers,
      body,
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    console.error("[api/files/upload] proxy error:", err);
    return NextResponse.json({ success: false, error: "Backend unavailable" }, { status: 502 });
  }
}
