import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const q = searchParams.get("q");
  const type = searchParams.get("type");
  const uploaderId = searchParams.get("uploaderId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const tags = searchParams.get("tags");
  const folderId = searchParams.get("folderId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

  const member = await db.collection(collections.orgMembers).findOne({ userId: session.user.id, orgId });
  if (!member) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const match: Record<string, unknown> = { orgId, deletedAt: null };
  const fileColl = collections.fileAttachments;

  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { originalName: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
    ];
  }

  if (type) {
    const typeMap: Record<string, string[]> = {
      document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/csv"],
      spreadsheet: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      image: [],
      video: [],
      audio: [],
      archive: [],
    };
    if (type === "image") match.mimeType = { $regex: "^image/" };
    else if (type === "video") match.mimeType = { $regex: "^video/" };
    else if (type === "audio") match.mimeType = { $regex: "^audio/" };
    else if (type === "archive") match.mimeType = { $in: ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed", "application/gzip", "application/x-tar"] };
    else match.mimeType = { $in: typeMap[type] || [type] };
  }

  if (uploaderId) match.uploaderId = uploaderId;
  if (folderId) match.folderId = folderId;
  if (tags) match.tags = { $in: tags.split(",").map((t: string) => t.trim()) };

  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) (match.createdAt as Record<string, unknown>).$gte = new Date(dateFrom);
    if (dateTo) (match.createdAt as Record<string, unknown>).$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;
  const [files, total, folders] = await Promise.all([
    (await db.collection(fileColl).find(match)).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    db.collection(fileColl).countDocuments(match),
    q ? (await db.collection("folders").find({
      orgId, deletedAt: null,
      name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
    })).limit(10).toArray() : [],
  ]);

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const users = await (await db.collection(collections.users).find({ id: { $in: userIds } })).toArray();
  const userMap = new Map(users.map(u => [u.id, u.name]));

  return NextResponse.json({
    data: {
      files: files.map(f => ({ ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown" })),
      folders: folders.map(f => ({ id: f.id, name: f.name, path: f.path, parentId: f.parentId })),
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
