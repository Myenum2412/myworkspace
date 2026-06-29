import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import mongoose from "mongoose";
import { Client } from "../lib/db/models/Client.js";
import { ClientUser } from "../lib/db/models/ClientUser.js";
import { ClientAuditLog } from "../lib/db/models/ClientAuditLog.js";
import { ClientWorkspace } from "../lib/db/models/ClientWorkspace.js";
import { Folder } from "../lib/db/models/Folder.js";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { User } from "../lib/db/models/User.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { sendClientWelcomeEmail } from "../lib/mail/index.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { env } from "../config/env.js";
import { provisionClientWorkspace } from "../lib/workspace/provision.js";

const router = Router();

router.use(authenticate);

async function resolveOrgId(req: AuthRequest): Promise<string> {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.orgId) return req.user.orgId;

  const { userId, email } = req.user;

  const direct = await OrgMember.findOne({ userId }).lean();
  if (direct) return direct.orgId;

  if (email) {
    const userDoc = await User.findOne({ email }).lean();
    if (userDoc) {
      if (userDoc.orgId) return userDoc.orgId;
      const member = await OrgMember.findOne({ userId: userDoc.id }).lean();
      if (member) return member.orgId;
    }
  }

  throw new AppError(400, "User is not associated with any organization");
}

function generatePassword(length = 12): string {
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

function generateUsername(clientName: string): string {
  const base = clientName.toLowerCase().replace(/[^a-z0-9]/g, ".").replace(/\.+/g, ".").replace(/^\.|\.$/g, "") || "client";
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}.${suffix}`;
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req);
  const clients = await Client.find({ orgId }).sort({ createdAt: -1 }).lean();
  const clientUsers = await ClientUser.find({ orgId }).lean();
  const userMap = new Map(clientUsers.map((u) => [u.clientId, u]));
  const enriched = clients.map((c) => ({
    ...c,
    username: userMap.get(c.id)?.username || "",
  }));
  res.json({ success: true, data: enriched, total: enriched.length });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req);
  const client = await Client.findOne({ id: req.params.id, orgId }).lean();
  if (!client) {
    throw new AppError(404, "Client not found");
  }
  res.json({ success: true, data: client });
});

router.get("/:id/workspace", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req);
  const clientId = req.params.id;

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

  res.json({
    success: true,
    data: {
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
    },
  });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req);
  const adminId = req.user!.userId;
  const adminEmail = req.user!.email;

  if (!req.body.name || !req.body.email || !req.body.primaryContact) {
    throw new AppError(400, "Name, email, and primary contact are required");
  }

  const [existingClient, existingUser] = await Promise.all([
    Client.findOne({ email: req.body.email, orgId }).lean(),
    ClientUser.findOne({ email: req.body.email }).lean(),
  ]);
  if (existingClient) {
    throw new AppError(409, "A client with this email already exists in your organization");
  }
  if (existingUser) {
    throw new AppError(409, "A client user with this email already exists");
  }

  const clientId = uuid();
  const clientUserId = uuid();
  const username = generateUsername(req.body.name);
  const rawPassword = req.body.password || generatePassword();
  const hashedPassword = await hash(rawPassword, 10);

  const client = new Client({
    ...req.body,
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
    email: req.body.email,
    password: hashedPassword,
    name: req.body.name,
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
    await provisionClientWorkspace(orgId, clientId, adminId, req.body.name, session);
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
          description: `Client ${req.body.name} created by admin ${adminEmail}`,
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

  // Delta emit to org room — other admins see the new client instantly.
  socketIOManager.emitToOrg(orgId, "client:created", {
    id: clientId,
    orgId,
    name: req.body.name,
  });

  sendClientWelcomeEmail(
    req.body.email,
    req.body.name,
    username,
    rawPassword,
    `${env.APP_URL}/client/login`
  ).catch((err: Error) => {
    console.error("[mail] client welcome email failed:", err?.message || err);
  });

  res.status(201).json({
    success: true,
    data: {
      client: { ...client.toObject(), username },
      workspaceUrl: `/clients/${clientId}`,
      credentials: {
        username,
        email: req.body.email,
        password: rawPassword,
        loginUrl: `${env.APP_URL}/client/login`,
      },
    },
  });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req);
  const adminId = req.user!.userId;
  const adminEmail = req.user!.email;

  const client = await Client.findOneAndUpdate(
    { id: req.params.id, orgId },
    { $set: { ...req.body, updatedBy: adminId } },
    { new: true }
  ).lean();

  if (!client) {
    throw new AppError(404, "Client not found");
  }

  void ClientAuditLog.create({
    orgId,
    clientId: req.params.id,
    createdBy: adminId,
    action: "client.updated",
    entityType: "client",
    entityId: req.params.id,
    description: `Client ${client.name} updated by ${adminEmail}`,
  });

  socketIOManager.emitToOrg(orgId, "client:updated", {
    id: req.params.id,
    orgId,
    name: client.name,
    updatedAt: client.updatedAt ?? new Date(),
  });

  res.json({ success: true, data: client });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req);
  const adminId = req.user!.userId;
  const client = await Client.findOneAndDelete({ id: req.params.id, orgId }).lean();

  if (!client) {
    throw new AppError(404, "Client not found");
  }

  const [, ] = await Promise.all([
    Promise.allSettled([
      ClientUser.deleteOne({ clientId: req.params.id }),
      ClientAuditLog.deleteMany({ clientId: req.params.id }),
    ]),
    ClientAuditLog.create({
      orgId,
      createdBy: adminId,
      action: "client.deleted",
      entityType: "client",
      entityId: req.params.id,
      description: `Client ${client.name} deleted`,
    }),
  ]);

  socketIOManager.emitToOrg(orgId, "client:deleted", {
    id: req.params.id,
    orgId,
  });

  res.json({ success: true, message: "Client deleted" });
});

export default router;
