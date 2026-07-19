import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function GET(req: NextRequest) {
  try {
    const qs = req.nextUrl.searchParams.toString();
    const res = await fetch(`${API_URL}/api/folders/tree${qs ? `?${qs}` : ""}`, {
      headers: {
        cookie: req.headers.get("cookie") || "",
        authorization: req.headers.get("authorization") || "",
      },
      cache: "no-store",
    });
    const text = await res.text();
    const out = new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    });
    const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const c of setCookies) out.headers.append("Set-Cookie", c);
    return out;
  } catch (err) {
    console.error("[api/folders/tree] proxy error:", err);
    return NextResponse.json({ success: false, error: "Backend unavailable" }, { status: 502 });
  }
}
