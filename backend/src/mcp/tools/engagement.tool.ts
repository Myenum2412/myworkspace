import { v4 as uuidv4 } from "uuid";
import { toolRegistry } from "./registry.js";
import { mcpMemoryManager } from "../memory/manager.js";

function calculateLeadScore(engagement: {
  customerName: string;
  contact: string;
  source: string;
  remarks: string;
  status: string;
}): number {
  let score = 0;

  if (engagement.customerName?.trim()) score += 10;
  if (engagement.contact?.trim()) score += 15;
  if (engagement.remarks && engagement.remarks.length > 50) score += 10;
  if (engagement.remarks && engagement.remarks.length > 150) score += 10;

  const sourceScores: Record<string, number> = {
    Referral: 20,
    Website: 10,
    Phone: 15,
    "Social Media": 10,
    Email: 12,
    "Walk-in": 8,
  };
  score += sourceScores[engagement.source] || 5;

  const statusScores: Record<string, number> = {
    Qualified: 25,
    Proposal: 35,
    Won: 50,
    Lost: 0,
    Contacted: 10,
    New: 5,
  };
  score += statusScores[engagement.status] || 0;

  return Math.min(100, score);
}

toolRegistry.register({
  name: "engagement.create",
  description: "Creates a new customer engagement/lead record. Collects customer information, qualifies the lead, and stores the interaction. Automatically calculates a lead score.",
  requiredRole: ["admin", "manager", "member"],
  handler: async (params: Record<string, unknown>, ctx) => {
    const { customerName, contact, source, status, assignedTo, followUpDate, remarks } = params as Record<string, string>;

    if (!customerName?.trim()) {
      throw new Error("customerName is required");
    }

    const engagement = {
      id: uuidv4(),
      orgId: ctx.org.id,
      date: new Date().toISOString().split("T")[0],
      customerName: customerName.trim(),
      contact: contact?.trim() || "",
      source: source || "Website",
      status: status || "New",
      assignedTo: assignedTo?.trim() || "",
      followUpDate: followUpDate || "",
      remarks: remarks?.trim() || "",
      leadScore: 0,
      createdBy: ctx.user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    engagement.leadScore = calculateLeadScore(engagement);

    const { MongoClient } = await import("mongodb");
    const mongoose = (await import("mongoose")).default;
    const db = mongoose.connection.db!;
    await db.collection("engagements").insertOne(engagement);

    await mcpMemoryManager.addEntry({
      sessionId: ctx.user.sessionId,
      userId: ctx.user.userId,
      orgId: ctx.org.id,
      role: "system",
      content: `Created engagement for ${engagement.customerName} (score: ${engagement.leadScore})`,
      metadata: { engagementId: engagement.id, source: engagement.source },
    });

    return {
      engagementId: engagement.id,
      customerName: engagement.customerName,
      source: engagement.source,
      status: engagement.status,
      leadScore: engagement.leadScore,
      createdAt: engagement.createdAt,
    };
  },
});

toolRegistry.register({
  name: "engagement.update",
  description: "Updates an existing customer engagement record. Use when a returning customer continues a conversation — updates status, remarks, lead score, and follow-up date instead of creating a duplicate.",
  requiredRole: ["admin", "manager", "member"],
  handler: async (params: Record<string, unknown>, ctx) => {
    const { engagementId, customerName, contact, source, status, assignedTo, followUpDate, remarks } = params as Record<string, string>;

    if (!engagementId) {
      throw new Error("engagementId is required");
    }

    const mongoose = (await import("mongoose")).default;
    const db = mongoose.connection.db!;
    const existing = await db.collection("engagements").findOne({ id: engagementId, orgId: ctx.org.id });
    if (!existing) {
      throw new Error("Engagement not found");
    }

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (customerName) update.customerName = customerName.trim();
    if (contact !== undefined) update.contact = contact.trim();
    if (source) update.source = source;
    if (status) update.status = status;
    if (assignedTo !== undefined) update.assignedTo = assignedTo.trim();
    if (followUpDate !== undefined) update.followUpDate = followUpDate;
    if (remarks !== undefined) update.remarks = remarks.trim();

    const merged = { ...existing, ...update };
    const scoreInput = {
      customerName: String(merged.customerName || ""),
      contact: String(merged.contact || ""),
      source: String(merged.source || ""),
      remarks: String(merged.remarks || ""),
      status: String(merged.status || ""),
    };
    update.leadScore = calculateLeadScore(scoreInput);

    await db.collection("engagements").updateOne(
      { id: engagementId },
      { $set: update }
    );

    await mcpMemoryManager.addEntry({
      sessionId: ctx.user.sessionId,
      userId: ctx.user.userId,
      orgId: ctx.org.id,
      role: "system",
      content: `Updated engagement ${engagementId}: status=${status || existing.status}, score=${update.leadScore}`,
      metadata: { engagementId },
    });

    return {
      engagementId,
      updated: true,
      leadScore: update.leadScore,
      status: update.status || existing.status,
    };
  },
});

toolRegistry.register({
  name: "engagement.get",
  description: "Retrieves a specific customer engagement record by ID or finds an existing engagement by customer contact (phone/email). Used to check if a returning customer already has a record.",
  requiredRole: ["admin", "manager", "member"],
  handler: async (params: Record<string, unknown>, ctx) => {
    const { engagementId, contact } = params as Record<string, string>;

    const mongoose = (await import("mongoose")).default;
    const db = mongoose.connection.db!;

    if (engagementId) {
      const doc = await db.collection("engagements").findOne({ id: engagementId, orgId: ctx.org.id });
      return doc || { found: false };
    }

    if (contact) {
      const doc = await db.collection("engagements").findOne({ contact: contact.trim(), orgId: ctx.org.id });
      return doc || { found: false };
    }

    throw new Error("Provide either engagementId or contact to search");
  },
});

toolRegistry.register({
  name: "engagement.list",
  description: "Lists all customer engagements for the organization. Supports filtering by status, source, assignedTo, and date range.",
  requiredRole: ["admin", "manager", "member"],
  handler: async (params: Record<string, unknown>, ctx) => {
    const { status, source, assignedTo, limit: limitParam, offset } = params as Record<string, string>;

    const mongoose = (await import("mongoose")).default;
    const db = mongoose.connection.db!;

    const filter: Record<string, unknown> = { orgId: ctx.org.id };
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo;

    const limit = Math.min(parseInt(limitParam as string) || 50, 100);
    const skip = parseInt(offset as string) || 0;

    const docs = await db.collection("engagements")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return {
      engagements: docs,
      total: docs.length,
      limit,
      skip,
    };
  },
});

toolRegistry.register({
  name: "engagement.delete",
  description: "Deletes a customer engagement record. Admin-only operation.",
  requiredRole: ["admin"],
  handler: async (params: Record<string, unknown>, ctx) => {
    const { engagementId } = params as Record<string, string>;

    if (!engagementId) {
      throw new Error("engagementId is required");
    }

    const mongoose = (await import("mongoose")).default;
    const db = mongoose.connection.db!;
    const result = await db.collection("engagements").deleteOne({ id: engagementId, orgId: ctx.org.id });

    if (result.deletedCount === 0) {
      throw new Error("Engagement not found");
    }

    return { deleted: true, engagementId };
  },
});
