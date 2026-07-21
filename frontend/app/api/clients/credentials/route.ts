import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { ensureUserOrg } from "@/lib/org";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const clientUser = await db.collection(collections.clientUsers).findOne(
      { clientId, orgId },
      { projection: { username: 1, email: 1, name: 1, isActive: 1, mustChangePassword: 1 } }
    );

    if (!clientUser) {
      return NextResponse.json({ error: "Client credentials not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: clientUser });
  } catch (err: any) {
    console.error("[API /api/clients/credentials] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
