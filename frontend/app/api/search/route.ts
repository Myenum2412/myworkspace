import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId") || session.user.orgId;
  const q = searchParams.get("q");

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  if (!q) {
    return NextResponse.json({ error: "Search query (q) is required" }, { status: 400 });
  }

  const backendUrl = new URL(`${API_URL}/api/search`);
  backendUrl.searchParams.set("orgId", orgId);
  backendUrl.searchParams.set("q", q);
  backendUrl.searchParams.set("page", searchParams.get("page") || "1");
  backendUrl.searchParams.set("limit", searchParams.get("limit") || "10");

  try {
    const res = await fetch(backendUrl.toString(), {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Backend search failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[API /api/search] Proxy error:", err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
