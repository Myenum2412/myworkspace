import mongoose from "mongoose";
import { collections } from "../../../lib/db/collections.js";
import { logger } from "../../../lib/logger/index.js";

export interface SoulTag {
  name: string;
  description: string;
  handler: (message: string) => Promise<string | null>;
}

const TAG_PATTERN = /\{(\w+)\}\s*-\s*(.+?)(?=\n\{|\n*$)/gs;

export class SoulTagRegistry {
  private tags: Map<string, SoulTag> = new Map();

  registerTag(tag: SoulTag): void {
    this.tags.set(tag.name.toLowerCase(), tag);
  }

  parseTags(soul: string): string[] {
    const found: string[] = [];
    const matches = soul.matchAll(TAG_PATTERN);
    for (const match of matches) {
      const name = match[1].toLowerCase();
      if (this.tags.has(name)) {
        found.push(name);
      }
    }
    return found;
  }

  async executeTag(
    tagName: string,
    message: string
  ): Promise<string | null> {
    const tag = this.tags.get(tagName.toLowerCase());
    if (!tag) return null;
    try {
      logger.info({ tag: tagName }, "Executing soul tag");
      return await tag.handler(message);
    } catch (error: any) {
      logger.error({ tag: tagName, error: error.message }, "Soul tag execution failed");
      return `I encountered an error while processing the ${tagName} request. Please try again later.`;
    }
  }

  getRegisteredTags(): string[] {
    return Array.from(this.tags.keys());
  }
}

// ── Stock Tag Handler ──

async function handleStockTag(message: string): Promise<string> {
  const collection = mongoose.connection.db!.collection(collections.products);

  const [totalProducts, totalStock, lowStock, outOfStock, categoryBreakdown] =
    await Promise.all([
      collection.countDocuments({ status: "active" }),
      collection
        .aggregate([
          { $match: { status: "active" } },
          { $group: { _id: null, total: { $sum: "$stock" } } },
        ])
        .toArray(),
      collection
        .find({ status: "active", stock: { $gt: 0, $lte: 5 } })
        .sort({ stock: 1 })
        .toArray(),
      collection.countDocuments({ status: "active", stock: 0 }),
      collection
        .aggregate([
          { $match: { status: "active" } },
          { $group: { _id: "$category", count: { $sum: 1 }, totalStock: { $sum: "$stock" } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
    ]);

  const totalStockQty = totalStock[0]?.total || 0;

  let reply = "*📦 Complete Stock Analysis*\n\n";
  reply += `*Overview:*\n`;
  reply += `• Active Products: ${totalProducts}\n`;
  reply += `• Total Units: ${totalStockQty}\n`;
  reply += `• Out of Stock: ${outOfStock}\n`;
  reply += `• Low Stock Items: ${lowStock.length}\n\n`;

  if (categoryBreakdown.length > 0) {
    reply += `*Category Breakdown:*\n`;
    for (const cat of categoryBreakdown) {
      reply += `• ${cat._id}: ${cat.count} products, ${cat.totalStock} units\n`;
    }
    reply += "\n";
  }

  if (lowStock.length > 0) {
    reply += `*⚠️ Low Stock Alerts (≤5 units):*\n`;
    for (const item of lowStock.slice(0, 10)) {
      reply += `• ${item.name}: ${item.stock} units left\n`;
    }
    if (lowStock.length > 10) {
      reply += `  ...and ${lowStock.length - 10} more items\n`;
    }
    reply += "\n";
  }

  if (outOfStock > 0) {
    const topOutOfStock = await collection
      .find({ status: "active", stock: 0 })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray();
    reply += `*❌ Out of Stock Items:*\n`;
    for (const item of topOutOfStock) {
      reply += `• ${item.name}\n`;
    }
    if (outOfStock > 5) {
      reply += `  ...and ${outOfStock - 5} more items\n`;
    }
  }

  return reply;
}

// ── Singleton ──

let instance: SoulTagRegistry | null = null;

export function getSoulTagRegistry(): SoulTagRegistry {
  if (!instance) {
    instance = new SoulTagRegistry();
    instance.registerTag({
      name: "stock",
      description: "Analyze current stock levels and auto-reply with complete inventory status",
      handler: handleStockTag,
    });
  }
  return instance;
}
