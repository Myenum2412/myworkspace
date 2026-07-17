import { getStorageProvider } from "./providers.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { logger } from "../logger/index.js";

export class LifecycleManager {
  async applyRetentionRules(orgId: string): Promise<number> {
    const rules = await this.getRetentionRules(orgId);
    let deleted = 0;
    for (const rule of rules) {
      const cutoff = new Date(Date.now() - rule.retentionDays * 86400000);
      const expired = await FileAttachment.find({
        orgId,
        category: rule.category,
        createdAt: { $lt: cutoff },
        deletedAt: null,
      }).lean();

      for (const file of expired) {
        try {
          await getStorageProvider().delete(file.storagePath);
          await FileAttachment.findOneAndUpdate(
            { id: file.id },
            { $set: { deletedAt: new Date(), deletedBy: "lifecycle-policy" } }
          );
          deleted++;
        } catch (err) {
          logger.warn({ err, fileId: file.id }, "Lifecycle deletion failed");
        }
      }
    }
    return deleted;
  }

  async cleanupTempFiles(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 3600000);
    const result = await FileAttachment.deleteMany({
      $or: [
        { createdAt: { $lt: cutoff }, size: 0 },
        { deletedAt: { $ne: null, $lt: cutoff } },
      ],
    });
    return result.deletedCount || 0;
  }

  private async getRetentionRules(orgId: string): Promise<{ category: string; retentionDays: number }[]> {
    return [
      { category: "report", retentionDays: 365 },
      { category: "general", retentionDays: 180 },
    ];
  }
}
