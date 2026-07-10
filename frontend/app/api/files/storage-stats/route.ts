import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const userId = session.user.id;
  const USER_STORAGE_LIMIT = 1024 * 1024 * 1024;

  try {
    const [userFiles, deletedAgg, fileTypeBreakdown, largestFile, recentUploads, monthlyStats] = await Promise.all([
      db.collection(collections.fileAttachments).find({ orgId, uploaderId: userId, deletedAt: null }).sort({ size: -1 }).toArray(),
      db.collection(collections.fileAttachments).aggregate([
        { $match: { orgId, uploaderId: userId, deletedAt: { $ne: null } } },
        { $group: { _id: null, count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
      ]).toArray(),
      db.collection(collections.fileAttachments).aggregate([
        { $match: { orgId, uploaderId: userId, deletedAt: null } },
        { $group: { _id: "$category", count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
        { $sort: { totalSize: -1 } },
      ]).toArray(),
      db.collection(collections.fileAttachments).find({ orgId, uploaderId: userId, deletedAt: null })
        .sort({ size: -1 }).project({ name: 1, size: 1, mimeType: 1, createdAt: 1 }).limit(1).toArray(),
      db.collection(collections.fileAttachments).find({ orgId, uploaderId: userId, deletedAt: null })
        .sort({ createdAt: -1 }).limit(10)
        .project({ id: 1, name: 1, size: 1, mimeType: 1, category: 1, createdAt: 1 }).toArray(),
      db.collection(collections.fileAttachments).aggregate([
        { $match: { orgId, uploaderId: userId, createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
        { $sort: { _id: 1 } },
      ]).toArray(),
    ]);

    const usedStorage = (userFiles as any[]).reduce((sum, f) => sum + (f.size || 0), 0);
    const availableStorage = Math.max(0, USER_STORAGE_LIMIT - usedStorage);
    const usagePercent = Math.min(100, (usedStorage / USER_STORAGE_LIMIT) * 100);
    const totalFiles = (userFiles as any[]).length;
    const deletedResult = deletedAgg as any[];
    const deletedFiles = deletedResult[0]?.count || 0;
    const deletedStorage = deletedResult[0]?.totalSize || 0;
    const averageFileSize = totalFiles > 0 ? Math.round(usedStorage / totalFiles) : 0;
    const lastUpload = userFiles.length > 0 ? (userFiles as any[])[0].createdAt : null;

    const categoryLabels: Record<string, string> = {
      image: "Images", video: "Videos", audio: "Audio",
      document: "Documents", archive: "Archives", general: "Others",
    };
    const ftBreakdown = fileTypeBreakdown as any[];
    const fileTypes = ftBreakdown.map((ft: any) => ({
      category: ft._id || "general",
      label: categoryLabels[ft._id] || "Others",
      count: ft.count,
      size: ft.totalSize,
      percent: usedStorage > 0 ? Math.round((ft.totalSize / usedStorage) * 100) : 0,
    }));

    const lfArr = largestFile as any[];
    const largestFileData = lfArr.length > 0 ? {
      name: lfArr[0].name, size: lfArr[0].size,
      mimeType: lfArr[0].mimeType, uploadedAt: lfArr[0].createdAt,
    } : null;

    const recent = recentUploads as any[];
    const recentUploadsData = recent.map((f: any) => ({
      id: f.id, name: f.name, size: f.size, mimeType: f.mimeType,
      category: f.category, uploadedAt: f.createdAt,
    }));

    const monthly = monthlyStats as any[];
    const monthlyStatsData = monthly.map((m: any) => ({ month: m._id, count: m.count, size: m.totalSize }));

    return NextResponse.json({
      success: true,
      data: {
        usedStorage, totalStorage: USER_STORAGE_LIMIT, availableStorage,
        usagePercent: Math.round(usagePercent * 10) / 10,
        totalFiles, deletedFiles, deletedStorage, averageFileSize,
        largestFile: largestFileData,
        lastUpload,
        fileTypes,
        recentUploads: recentUploadsData,
        monthlyStats: monthlyStatsData,
      },
    });
  } catch (e) {
    console.error("[storage-stats] Failed:", e);
    return NextResponse.json({ error: "Failed to fetch storage stats" }, { status: 500 });
  }
}
