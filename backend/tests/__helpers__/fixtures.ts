import { v4 as uuid } from "uuid";
import jwt from "jsonwebtoken";
import { hash } from "bcryptjs";
import { User } from "../../src/lib/db/models/User.js";
import { Organization } from "../../src/lib/db/models/Organization.js";
import { OrgMember } from "../../src/lib/db/models/OrgMember.js";
import { signToken } from "../../src/config/auth.js";
import { FileAttachment } from "../../src/lib/db/models/FileAttachment.js";
import { Task } from "../../src/lib/db/models/Task.js";
import { Session } from "../../src/lib/db/models/Session.js";
import { Notification } from "../../src/lib/db/models/Notification.js";
import { ActivityLog } from "../../src/lib/db/models/ActivityLog.js";
import { UploadSession } from "../../src/lib/db/models/UploadSession.js";

export interface OrgSeed {
  userId: string;
  orgId: string;
  email: string;
  headers: Record<string, string>;
  token: string;
}

export async function seedOrgWithAdmin(opts: {
  email?: string;
  name?: string;
  password?: string;
  role?: string;
}): Promise<OrgSeed> {
  const userId = uuid();
  const orgId = uuid();
  const name = opts.name || "Tester";
  const email = (opts.email || `admin-${Date.now()}@example.com`).toLowerCase();
  const password = opts.password || "SecurePass123";
  const role = opts.role || "admin";

  await User.create({
    id: userId,
    name,
    email,
    password: await hash(password, 10),
    status: "online",
    role,
    orgId,
    userNumber: Math.floor(Math.random() * 900000) + 100000,
  });
  await Organization.create({ id: orgId, name: `${name}'s Org`, slug: `slug-${userId.slice(0, 8)}`, plan: "free", ownerId: userId });
  await OrgMember.create({ orgId, userId, role });

  const token = signToken({ userId, email, role, permissions: [], orgId });
  return { userId, orgId, email, headers: { Authorization: `Bearer ${token}` }, token };
}

export async function seedSecondUser(orgId: string, role: string = "member"): Promise<{ userId: string; headers: Record<string, string> }> {
  const userId = uuid();
  const email = `user-${Date.now()}@example.com`;
  await User.create({
    id: userId, name: "Second User", email,
    password: await hash("SecurePass123", 10),
    status: "online", role, orgId,
    userNumber: Math.floor(Math.random() * 900000) + 100000,
  });
  await OrgMember.create({ orgId, userId, role });
  const token = signToken({ userId, email, role, permissions: [], orgId });
  return { userId, headers: { Authorization: `Bearer ${token}` } };
}

export async function seedFile(orgId: string, uploaderId: string, overrides?: Partial<Record<string, unknown>>): Promise<{ fileId: string; storagePath: string }> {
  const fileId = uuid();
  const storagePath = `test-${fileId}.pdf`;
  await FileAttachment.create({
    id: fileId,
    orgId,
    uploaderId,
    createdBy: uploaderId,
    fileName: "test.pdf",
    originalName: "test.pdf",
    storagePath,
    mimeType: "application/pdf",
    size: 1024,
    category: "general",
    folderId: null,
    clientId: null,
    projectId: null,
    checksum: "abc123",
    ...overrides,
  });
  return { fileId, storagePath };
}

export async function seedTask(orgId: string, assigneeId: string, overrides?: Partial<Record<string, unknown>>): Promise<string> {
  const doc = await Task.create({
    orgId,
    title: "Test Task",
    status: "draft",
    priority: "medium",
    assigneeId,
    createdBy: assigneeId,
    creatorId: assigneeId,
    description: "Test description",
    ...overrides,
  });
  return doc.id;
}

export async function seedSession(userId: string, orgId: string, overrides?: Partial<Record<string, unknown>>): Promise<string> {
  const sessionId = uuid();
  await Session.create({
    id: sessionId,
    userId,
    orgId,
    loginTime: new Date(),
    statusTransitions: [{ status: "online", timestamp: new Date() }],
    currentStatus: "online",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
  });
  return sessionId;
}

export async function seedNotification(userId: string, orgId: string, overrides?: Partial<Record<string, unknown>>): Promise<string> {
  const notifId = uuid();
  await Notification.create({
    id: notifId,
    userId,
    orgId,
    type: "system",
    title: "Test Notification",
    message: "Test message",
    read: false,
    ...overrides,
  });
  return notifId;
}

export async function seedActivityLog(orgId: string, userId: string, overrides?: Partial<Record<string, unknown>>): Promise<string> {
  const logId = uuid();
  await ActivityLog.create({
    id: logId,
    orgId,
    userId,
    createdBy: userId,
    action: "test.action",
    entityType: "test",
    entityId: logId,
    description: "Test activity",
    ...overrides,
  });
  return logId;
}

export async function seedUploadSession(orgId: string, uploaderId: string, overrides?: Partial<Record<string, unknown>>): Promise<string> {
  const uploadId = uuid();
  await UploadSession.create({
    tusId: uuid(),
    orgId,
    uploaderId,
    fileName: "test-upload.pdf",
    mimeType: "application/pdf",
    size: 2048,
    status: "pending",
    metadata: {},
    ...overrides,
  });
  return uploadId;
}

export function expiredJWT(payload: Record<string, unknown> = {}): string {
  return jwt.sign(
    { userId: uuid(), email: "test@example.com", role: "admin", ...payload },
    process.env.JWT_SECRET || "test-secret",
    { expiresIn: "0s" },
  );
}

export function tamperedJWT(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 3) return "invalid-token";
  parts[1] = parts[1] + "a";
  return parts.join(".");
}

export function algorithmNoneJWT(payload: Record<string, unknown> = {}): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ userId: uuid(), email: "admin@example.com", role: "super_admin", ...payload })).toString("base64url");
  return `${header}.${body}.`;
}

export function createLargePayload(sizeBytes: number): Record<string, string> {
  return { data: "x".repeat(sizeBytes) };
}

export function createNoSqlInjectionPayload(): Record<string, unknown> {
  return {
    email: { $ne: "" },
    password: { $gt: "" },
    $where: "1==1",
  };
}
