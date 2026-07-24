import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: { name: session.user.name, email: session.user.email, role: session.user.role } });
}
