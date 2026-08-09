import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });

  const { id } = await params;
  try {
    const channel = await db.collection(collections.chatChannels).findOne({
      id,
      orgId,
      members: session.user.id,
    });
    if (!channel)
      return NextResponse.json({ error: "Channel not found or no access" }, { status: 404 });

    await db.collection(collections.chatMessages).updateMany(
      {
        orgId,
        channelId: id,
        senderId: { $ne: session.user.id },
        readBy: { $ne: session.user.id },
      },
      { $addToSet: { readBy: session.user.id } },
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }
}
