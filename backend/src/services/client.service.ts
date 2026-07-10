import { Client } from "../lib/db/models/Client.js";
import { ClientUser } from "../lib/db/models/ClientUser.js";
import { ClientAuditLog } from "../lib/db/models/ClientAuditLog.js";
import { ClientWorkspace } from "../lib/db/models/ClientWorkspace.js";
import { Folder } from "../lib/db/models/Folder.js";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { User } from "../lib/db/models/User.js";
import { Organization } from "../lib/db/models/Organization.js";
import { Project } from "../lib/db/models/Project.js";
import { Task } from "../lib/db/models/Task.js";
import { AppError } from "../middleware/error.js";
import { cacheManager } from "../lib/cache.js";
import { sendClientWelcomeEmail } from "../lib/mail/index.js";
import { eventProducer } from "../lib/queue/producer.js";
import { provisionClientWorkspace } from "../lib/workspace/provision.js";
import { requireString, requireEmail } from "../lib/validate.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger/index.js";
import mongoose from "mongoose";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";

export async function resolveOrgId(userId: string, email?: string, userOrgId?: string): Promise<string> {
  if (userOrgId) return userOrgId;

  const direct = await OrgMember.findOne({ userId }).lean();
  if (direct?.orgId) return direct.orgId;

  if (email) {
    const userDoc = await User.findOne({ email }).lean();
    if (userDoc) {
      if (userDoc.orgId) return userDoc.orgId;
      const member = await OrgMember.findOne({ userId: userDoc.id }).lean();
      if (member?.orgId) return member.orgId;
    }
  }

  const anyOrg = await Organization.findOne({}).sort({ createdAt: 1 }).lean();
  if (anyOrg) {
    // Do NOT auto-create admin membership — this bypasses workspace isolation
    throw new AppError(403, "User is not a member of any workspace. Please contact your administrator.");
  }

  throw new AppError(400, "No organization found. Please set up company details first.");
}

export function generatePassword(length = 12): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;
  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  return password.split("").sort(() => Math.random() - 0.5).join("");
}

export function generateUsername(clientName: string): string {
  const base = clientName.toLowerCase().replace(/[^a-z0-9]/g, ".").replace(/\.+/g, ".").replace(/^\.|\.$/g, "") || "client";
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}.${suffix}`;
}

export async function listClients(orgId: string): Promise<any[]> {
  const clients = await Client.find({ orgId }).sort({ createdAt: -1 }).lean();
  const clientUsers = await ClientUser.find({ orgId }).lean();
  const userMap = new Map(clientUsers.map((u) => [u.clientId, u]));
  return clients.map((c) => ({
    ...c,
    username: userMap.get(c.id)?.username || "",
  }));
}

export async function getClient(orgId: string, clientId: string): Promise<any> {
  const client = await Client.findOne({ id: clientId, orgId }).lean();
  if (!client) {
    throw new AppError(404, "Client not found");
  }
  return client;
}

export async function getClientWorkspace(orgId: string, clientId: string): Promise<any> {
  const client = await Client.findOne({ id: clientId, orgId }).lean();
  if (!client) {
    throw new AppError(404, "Client not found");
  }

  const [workspace, folders, files, recentActivity, projectCount, reportCount] = await Promise.all([
    ClientWorkspace.findOne({ orgId, clientId }).lean(),
    Folder.find({ orgId, clientId, deletedAt: null }).sort({ path: 1 }).lean(),
    FileAttachment.find({ orgId, clientId, deletedAt: null })
      .select("id name originalName mimeType size category folderId createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(25)
      .lean(),
    ActivityLog.find({ orgId, entityId: clientId }).sort({ createdAt: -1 }).limit(10).lean(),
    mongoose.connection.db!.collection("projects").countDocuments({ orgId, client: client.name }),
    FileAttachment.countDocuments({ orgId, clientId, category: "report", deletedAt: null }),
  ]);

  if (!workspace) {
    throw new AppError(409, "Client workspace has not been provisioned");
  }

  const totalFileSize = files.reduce((sum, file) => sum + (file.size || 0), 0);

  return {
    client,
    workspace,
    dashboard: {
      clientId,
      modules: workspace.modules,
      metrics: {
        folders: folders.length,
        files: files.length,
        projects: projectCount,
        reports: reportCount,
        storageBytes: totalFileSize,
      },
      recentActivity,
      recentFiles: files.slice(0, 5),
    },
    fileManagement: {
      clientId,
      folders,
      files,
      permissions: workspace.permissions,
    },
    quickAccess: {
      dashboard: `/clients/${clientId}#dashboard`,
      fileManagement: `/clients/${clientId}#files`,
      projects: `/clients/${clientId}#projects`,
      reports: `/clients/${clientId}#reports`,
      settings: `/clients/${clientId}#settings`,
    },
  };
}

export interface CreateClientInput {
  orgId: string;
  adminId: string;
  adminEmail: string;
  name: string;
  email: string;
  primaryContact: string;
  password?: string;
  body: Record<string, any>;
}

export async function createClient(data: CreateClientInput): Promise<{ client: any; workspaceUrl: string; credentials: { username: string; email: string; password: string; loginUrl: string } }> {
  const { orgId, adminId, adminEmail } = data;
  const name = requireString(data.name, "name", { min: 1, max: 300 });
  const email = requireEmail(data.email, "email");
  const primaryContact = requireString(data.primaryContact, "primaryContact", { min: 1, max: 500 });

  const [existingClient, existingUser] = await Promise.all([
    Client.findOne({ email, orgId }).lean(),
    ClientUser.findOne({ email }).lean(),
  ]);
  if (existingClient) {
    throw new AppError(409, "A client with this email already exists in your organization");
  }
  if (existingUser) {
    throw new AppError(409, "A client user with this email already exists");
  }

  const clientId = uuid();
  const clientUserId = uuid();
  const username = generateUsername(name);
  const rawPassword = data.password || generatePassword();
  const hashedPassword = await hash(rawPassword, 12);

  const allowedFields = {
    name: data.body?.name,
    email: data.body?.email,
    primaryContact: data.body?.primaryContact,
    phone: data.body?.phone,
    company: data.body?.company,
    address: data.body?.address,
    notes: data.body?.notes,
  };
  Object.keys(allowedFields).forEach(k => (allowedFields as any)[k] === undefined && delete (allowedFields as any)[k]);

  const client = new Client({
    ...allowedFields,
    id: clientId,
    orgId,
    createdByAdminId: adminId,
    createdBy: adminId,
    clientUserId,
  });

  const clientUser = new ClientUser({
    id: clientUserId,
    orgId,
    clientId,
    username,
    email,
    password: hashedPassword,
    name,
    isActive: true,
    emailVerified: false,
    mustChangePassword: true,
    createdByAdminId: adminId,
    createdBy: adminId,
  });

  const session = await Client.startSession();
  try {
    session.startTransaction();
    await client.save({ session });
    await clientUser.save({ session });
    await provisionClientWorkspace(orgId, clientId, adminId, name, session);
    await ClientAuditLog.create(
      [
        {
          orgId,
          clientId,
          clientUserId,
          createdBy: adminId,
          action: "client.created",
          entityType: "client",
          entityId: clientId,
          description: `Client ${name} created by admin ${adminEmail}`,
        },
      ],
      { session }
    );
    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  cacheManager.invalidatePattern(`clients:${orgId}`);

  // Send welcome email with queue-backed reliability
  sendClientWelcomeEmail(
    email,
    name,
    username,
    rawPassword,
    `${env.APP_URL}/client/login`
  ).catch((err: Error) => {
    logger.error({ err, clientId, email }, "Direct welcome email failed, enqueuing for retry");
    eventProducer.notificationSend({
      userId: adminId,
      orgId,
      type: "email_retry",
      title: `Welcome email for ${name}`,
      message: `Failed to send welcome email to ${email}. Will retry via queue.`,
      link: `/clients/${clientId}`,
    }).catch((retryErr: Error) => {
      logger.error({ err: retryErr, clientId, email }, "Failed to enqueue email retry notification");
    });
  });

  return {
    client: { ...client.toObject(), username },
    workspaceUrl: `/clients/${clientId}`,
    credentials: {
      username,
      email,
      password: rawPassword,
      loginUrl: `${env.APP_URL}/client/login`,
    },
  };
}

const CLIENT_ALLOWED_UPDATE_FIELDS = ["name", "email", "primaryContact", "phone", "company", "address", "notes", "isActive"];

export async function updateClient(orgId: string, clientId: string, adminId: string, adminEmail: string, body: any): Promise<any> {
  const safeUpdate: Record<string, any> = { updatedBy: adminId };
  for (const field of CLIENT_ALLOWED_UPDATE_FIELDS) {
    if (body[field] !== undefined) safeUpdate[field] = body[field];
  }
  const client = await Client.findOneAndUpdate(
    { id: clientId, orgId },
    { $set: safeUpdate },
    { new: true }
  ).lean();

  if (!client) {
    throw new AppError(404, "Client not found");
  }

  if (body.password) {
    const hashedPassword = await hash(body.password, 12);
    await ClientUser.updateOne(
      { clientId: client.id, orgId },
      { $set: { password: hashedPassword, mustChangePassword: true, updatedBy: adminId } },
    );
    await ClientAuditLog.create({
      orgId, clientId, createdBy: adminId,
      action: "client.password_changed", entityType: "client", entityId: clientId,
      description: `Password changed for client ${client.name} by ${adminEmail}`,
    });
  }

  await ClientAuditLog.create({
    orgId,
    clientId,
    createdBy: adminId,
    action: "client.updated",
    entityType: "client",
    entityId: clientId,
    description: `Client ${client.name} updated by ${adminEmail}`,
  });

  cacheManager.invalidatePattern(`clients:${orgId}`);
  cacheManager.invalidatePattern(`client:${clientId}`);

  return client;
}

export async function deleteClient(orgId: string, clientId: string, adminId: string): Promise<void> {
  const client = await Client.findOneAndDelete({ id: clientId, orgId }).lean();

  if (!client) {
    throw new AppError(404, "Client not found");
  }

  // Cascade: delete projects linked to this client by name, and their tasks
  const projects = await Project.find({ orgId, client: client.name }).lean();
  const projectNames = projects.map((p) => p.name);

  await Promise.allSettled([
    ClientUser.deleteOne({ clientId }),
    ClientAuditLog.deleteMany({ clientId }),
    ...(projectNames.length > 0
      ? [Task.deleteMany({ orgId, project: { $in: projectNames } })]
      : []),
    ...(projects.length > 0
      ? [Project.deleteMany({ orgId, client: client.name })]
      : []),
  ]);

  await ClientAuditLog.create({
    orgId,
    createdBy: adminId,
    action: "client.deleted",
    entityType: "client",
    entityId: clientId,
    description: `Client ${client.name} deleted (including ${projects.length} project(s) and associated tasks)`,
  });

  cacheManager.invalidatePattern(`clients:${orgId}`);
  cacheManager.invalidatePattern(`client:${clientId}`);
}
