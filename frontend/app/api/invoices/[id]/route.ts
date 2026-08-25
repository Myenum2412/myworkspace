import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const res = await fetch(
      `${process.env.API_URL || "http://localhost:4000"}/api/billing/invoices/${id}`,
      {
        headers: { "x-user-id": session.user.id, "x-org-id": session.user.orgId || "" },
      },
    );
    if (!res.ok) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const res = await fetch(
      `${process.env.API_URL || "http://localhost:4000"}/api/billing/invoices/${id}`,
      {
        method: "DELETE",
        headers: { "x-user-id": session.user.id, "x-org-id": session.user.orgId || "" },
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
