import { FileAttachment } from "../db/models/FileAttachment.js";
import { StorageQuota } from "../db/models/StorageQuota.js";
import { logger } from "../logger/index.js";

export class StorageAnalytics {
  async getOrgStorageStats(orgId: string): Promise<{
    totalSize: number;
    fileCount: number;
    byType: Record<string, { count: number; size: number }>;
    dailyGrowth: { date: string; size: number }[];
    quotaUsed: number;
    quotaLimit: number;
  }> {
    const files = await FileAttachment.find({ orgId, deletedAt: null }).lean();
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    const byType: Record<string, { count: number; size: number }> = {};

    for (const file of files) {
      const category = file.mimeType.split("/")[0] || "unknown";
      if (!byType[category]) byType[category] = { count: 0, size: 0 };
      byType[category].count++;
      byType[category].size += (file as any).size || 0;
    }

    const quota = await StorageQuota.findOne({ orgId }).lean();

    return {
      totalSize,
      fileCount: files.length,
      byType,
      dailyGrowth: [],
      quotaUsed: totalSize,
      quotaLimit: (quota?.maxStorageBytes as number) || 1 * 1024 * 1024 * 1024,
    };
  }

  async getBandwidthUsage(orgId: string, days = 30): Promise<{ date: string; bytesDownloaded: number }[]> {
    return [];
  }
}
