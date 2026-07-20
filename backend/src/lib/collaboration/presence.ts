import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";

export interface IPresence extends Document {
  userId: string;
  orgId: string;
  status: "online" | "away" | "busy" | "offline";
  lastSeen: Date;
  currentResource: string;
  metadata: Record<string, unknown>;
}

export interface IActivityFeedItem extends Document {
  id: string;
  orgId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface ISharedWorkspace extends Document {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  members: { userId: string; role: "workspace_owner" | "workspace_editor" | "workspace_viewer"; joinedAt: Date }[];
  resources: { type: string; id: string; addedAt: Date }[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

const presenceSchema = new Schema<IPresence>({
  userId: { type: String, required: true },
  orgId: { type: String, required: true },
  status: { type: String, enum: ["online", "away", "busy", "offline"], default: "offline" },
  lastSeen: { type: Date, default: Date.now },
  currentResource: { type: String, default: "" },
  metadata: { type: Schema.Types.Mixed, default: {} },
});

presenceSchema.index({ orgId: 1, status: 1 });
presenceSchema.index({ userId: 1, orgId: 1 }, { unique: true });

const activityFeedSchema = new Schema<IActivityFeedItem>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  actorId: { type: String, required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  summary: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

activityFeedSchema.index({ orgId: 1, createdAt: -1 });

const sharedWorkspaceSchema = new Schema<ISharedWorkspace>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  members: [{ userId: String, role: { type: String, enum: ["workspace_owner", "workspace_editor", "workspace_viewer"] }, joinedAt: { type: Date, default: Date.now } }],
  resources: [{ type: String, id: String, addedAt: { type: Date, default: Date.now } }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true },
}, { timestamps: true });

export const Presence = model<IPresence>("Presence", presenceSchema);
export const ActivityFeed = model<IActivityFeedItem>("ActivityFeed", activityFeedSchema);
export const SharedWorkspace = model<ISharedWorkspace>("SharedWorkspace", sharedWorkspaceSchema);

export class CollaborationEngine {
  async updatePresence(userId: string, orgId: string, status: IPresence["status"], resource?: string): Promise<void> {
    await Presence.findOneAndUpdate(
      { userId, orgId },
      { $set: { status, lastSeen: new Date(), currentResource: resource || "" } },
      { upsert: true },
    );
  }

  async getOnlineUsers(orgId: string): Promise<IPresence[]> {
    return Presence.find({ orgId, status: { $ne: "offline" } }).lean() as any;
  }

  async recordActivity(params: {
    orgId: string; actorId: string; action: string;
    entityType: string; entityId: string; summary: string;
    metadata?: Record<string, unknown>;
  }): Promise<IActivityFeedItem> {
    return ActivityFeed.create({ id: uuid(), ...params, metadata: params.metadata || {} });
  }

  async getActivityFeed(orgId: string, limit = 50, offset = 0): Promise<{ items: IActivityFeedItem[]; total: number }> {
    const [items, total] = await Promise.all([
      ActivityFeed.find({ orgId }).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      ActivityFeed.countDocuments({ orgId }),
    ]);
    return { items: items as any, total };
  }

  async createWorkspace(params: {
    orgId: string; name: string; description?: string;
    members?: { userId: string; role: "workspace_owner" | "workspace_editor" | "workspace_viewer" }[];
    createdBy: string;
  }): Promise<ISharedWorkspace> {
    return SharedWorkspace.create({
      id: uuid(), ...params,
      members: params.members || [{ userId: params.createdBy, role: "workspace_owner", joinedAt: new Date() }],
      resources: [],
      isActive: true,
    });
  }

  async addWorkspaceMembers(workspaceId: string, members: { userId: string; role: "workspace_owner" | "workspace_editor" | "workspace_viewer" }[]): Promise<void> {
    await SharedWorkspace.updateOne(
      { id: workspaceId },
      { $push: { members: { $each: members.map(m => ({ ...m, joinedAt: new Date() })) } } },
    );
  }

  async addWorkspaceResource(workspaceId: string, type: string, id: string): Promise<void> {
    await SharedWorkspace.updateOne(
      { id: workspaceId },
      { $push: { resources: { type, id, addedAt: new Date() } } },
    );
  }
}

export const collaboration = new CollaborationEngine();
