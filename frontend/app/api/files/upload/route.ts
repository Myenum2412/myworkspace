import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");
const CSRF_COOKIE = "csrf-token";

function readCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function parseSetCookieToken(setCookies: string[]): string | null {
  for (const raw of setCookies) {
    const match = raw.match(new RegExp(`^${CSRF_COOKIE}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

async function ensureCsrf(cookieHeader: string): Promise<{ cookie: string; token: string | null; setCookies: string[] }> {
  let cookie = cookieHeader;
  let token = readCookie(cookie, CSRF_COOKIE);
  const setCookies: string[] = [];

  if (token) return { cookie, token, setCookies };

  const seed = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie },
    cache: "no-store",
  });
  const seeded = typeof seed.headers.getSetCookie === "function" ? seed.headers.getSetCookie() : [];
  setCookies.push(...seeded);
  token = parseSetCookieToken(seeded);
  if (token) {
    cookie = cookie ? `${cookie}; ${CSRF_COOKIE}=${token}` : `${CSRF_COOKIE}=${token}`;
  }
  return { cookie, token, setCookies };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const incomingCookie = req.headers.get("cookie") || "";
    const { cookie, token, setCookies } = await ensureCsrf(incomingCookie);

    const headers: HeadersInit = {};
    if (cookie) headers.cookie = cookie;
    if (token) headers["x-csrf-token"] = token;
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
    const out = new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
      },
    });

    for (const c of setCookies) out.headers.append("Set-Cookie", c);
    const backendSet = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const c of backendSet) out.headers.append("Set-Cookie", c);

    return out;
  } catch (err) {
    console.error("[api/files/upload] proxy error:", err);
    return NextResponse.json({ success: false, error: "Backend unavailable" }, { status: 502 });
  }
}
