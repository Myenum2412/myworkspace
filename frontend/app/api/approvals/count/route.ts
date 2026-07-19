import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 });
    }

    const orgId = await getUserOrgId(session.user.id, session.user.email);
    if (!orgId) {
      return NextResponse.json({ count: 0 });
    }

    const [taskCount, fileCount] = await Promise.all([
      db.collection(collections.tasks).countDocuments({
        orgId,
        status: { $in: ["submitted", "completed"] },
        approvedBy: null,
        rejectedBy: null,
      }),
      db.collection(collections.uploadApprovals).countDocuments({
        orgId,
        status: "pending",
      }),
    ]);

    return NextResponse.json({ count: taskCount + fileCount });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
