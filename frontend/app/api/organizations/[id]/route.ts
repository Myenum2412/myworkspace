import { NextRequest, NextResponse } from "next/server";
import { apiUrl, apiFetch } from "@/lib/api";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const cookie = req.headers.get("cookie") || "";
    const res = await apiFetch(apiUrl(`/api/organizations/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}
