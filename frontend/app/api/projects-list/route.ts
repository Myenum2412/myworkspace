import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
    if (!orgId) {
      return NextResponse.json({ data: [] });
    }

    const projects = await db.collection(collections.projects)
      .find({ orgId })
      .sort({ createdAt: -1 })
      .toArray();

    const data = projects.map((p: Record<string, unknown>) => {
      const { _id, ...rest } = p;
      return rest;
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
