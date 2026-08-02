import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { v4 as uuid } from "uuid";

export async function POST() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

  const results = { clients: { created: 0, skipped: 0 }, staff: { created: 0, skipped: 0 } };

  try {
    // Backfill client folders
    const clients = await db.collection(collections.clients).find({ orgId }).toArray() as any[];
    for (const client of clients) {
      const clientId = client.id || client._id?.toString();
      if (!clientId) continue;

      const existing = await db.collection("folders").findOne({ orgId, clientId, deletedAt: null });
      if (existing) {
        results.clients.skipped++;
        continue;
      }

      const folderName = client.displayName || client.name || client.company || "Client";
      const rootFolderId = uuid();
      await db.collection("folders").insertOne({
        id: rootFolderId, orgId, parentId: null, name: folderName,
        path: `/${folderName}`, clientId,
        createdBy: session.user.id, deletedAt: null,
        createdAt: new Date(), updatedAt: new Date(),
      });

      const subfolders = ["Documents", "Contracts", "Invoices", "Projects", "Drawings", "Images", "Reports", "Attachments", "Other"];
      for (const sub of subfolders) {
        await db.collection("folders").insertOne({
          id: uuid(), orgId, parentId: rootFolderId, name: sub,
          path: `/${folderName}/${sub}`, clientId,
          createdBy: session.user.id, deletedAt: null,
          createdAt: new Date(), updatedAt: new Date(),
        });
      }
      results.clients.created++;
    }

    // Backfill staff folders
    const allOrgMembers = await db.collection(collections.orgMembers).find({ orgId }).toArray() as any[];
    const userIds = [...new Set(allOrgMembers.map((m) => m.userId).filter(Boolean))];

    if (userIds.length > 0) {
      const users = await db.collection(collections.users).find({ id: { $in: userIds } }).toArray() as any[];
      for (const user of users) {
        const userId = user.id || user._id?.toString();
        if (!userId) continue;

        const existing = await db.collection("folders").findOne({ orgId, createdBy: userId, clientId: null, deletedAt: null });
        if (existing) {
          results.staff.skipped++;
          continue;
        }

        const folderName = user.name || user.email || "Staff";
        await db.collection("folders").insertOne({
          id: uuid(), orgId, parentId: null, name: folderName,
          path: `/${folderName}`, clientId: null,
          createdBy: userId, deletedAt: null,
          createdAt: new Date(), updatedAt: new Date(),
        });
        results.staff.created++;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error("[POST /api/files/backfill-user-folders]", err);
    return NextResponse.json({ error: "Backfill failed", results }, { status: 500 });
  }
}
