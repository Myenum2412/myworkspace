import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

export async function GET() {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const res = await fetch(
      `${process.env.API_URL || "http://localhost:4000"}/api/billing/invoices`,
      {
        headers: { "x-user-id": session.user.id, "x-org-id": session.user.orgId || "" },
      },
    );
    if (!res.ok) return NextResponse.json({ invoices: [], total: 0 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ invoices: [], total: 0 });
  }
}

export async function POST(req: Request) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const res = await fetch(
      `${process.env.API_URL || "http://localhost:4000"}/api/billing/invoices`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.user.id,
          "x-org-id": session.user.orgId || "",
        },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
