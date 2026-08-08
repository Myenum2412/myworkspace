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
  return NextResponse.json({ expenses: [], total: 0 });
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
