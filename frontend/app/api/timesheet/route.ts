import { NextRequest, NextResponse } from "next/server";

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");

export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const body = await request.json();

    const headers: Record<string, string> = {
      cookie,
      "Content-Type": "application/json",
    };

    const res = await fetch(`${API_URL}/api/timesheet`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save timesheet" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get("orgId");
    const userId = searchParams.get("userId");
    const week = searchParams.get("week");

    const params = new URLSearchParams();
    if (orgId) params.set("orgId", orgId);
    if (userId) params.set("userId", userId);
    if (week) params.set("week", week);

    const res = await fetch(`${API_URL}/api/timesheet?${params}`, {
      method: "GET",
      headers: { cookie },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch timesheet" }, { status: 500 });
  }
}
