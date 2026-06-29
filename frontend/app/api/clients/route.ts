import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth/config";
import { ensureUserOrg } from "@/lib/org";

// Mirrors backend workspace-provision template so client folders are always
// created from the file-management side, even if the backend proxy is unreachable.
const CLIENT_SUBFOLDERS = ["Documents", "Reports", "Projects", "Settings"];

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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await ensureUserOrg(session.user.id, session.user.email);

    const clients = await db.collection(collections.clients).find({ orgId }, { sort: { createdAt: -1 } }).toArray() as Record<string, unknown>[];
    const clientUsers = await (await db.collection(collections.clientUsers).find({ orgId }).toArray()) as Record<string, unknown>[];
    const userMap = new Map(clientUsers.map((u) => [u.clientId, u]));
    const enriched = clients.map((c) => ({
      ...c,
      username: userMap.get(c.id)?.username || "",
    }));

    return NextResponse.json({ success: true, data: enriched, total: enriched.length });
  } catch (err: any) {
    console.error("[API /api/clients] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await ensureUserOrg(session.user.id, session.user.email);
    const adminId = session.user.id;

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const existingClient = await db.collection(collections.clients).findOne({ email, orgId });
    if (existingClient) {
      return NextResponse.json({ error: "A client with this email already exists in your organization" }, { status: 409 });
    }

    const clientId = uuid();
    const clientUserId = uuid();
    const username = generateUsername(name);
    const rawPassword = password || generatePassword();
    const hashedPassword = await hash(rawPassword, 10);

    const client = {
      id: clientId,
      orgId,
      createdByAdminId: adminId,
      createdBy: adminId,
      clientUserId,
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const clientUser = {
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(collections.clients).insertOne(client);
    await db.collection(collections.clientUsers).insertOne(clientUser);

    // Provision client folders in file management (mirrors backend template).
    const clientFolderId = uuid();
    await db.collection(collections.folders).insertOne({
      id: clientFolderId,
      orgId,
      clientId,
      parentId: null,
      name,
      path: `/clients/${clientId}`,
      createdBy: adminId,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    for (const sub of CLIENT_SUBFOLDERS) {
      await db.collection(collections.folders).insertOne({
        id: uuid(),
        orgId,
        clientId,
        parentId: clientFolderId,
        name: sub,
        path: `/clients/${clientId}/${sub}`,
        createdBy: adminId,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";

    return NextResponse.json({
      success: true,
      data: {
        client: { ...client, username },
        workspaceUrl: `/clients/${clientId}`,
        credentials: {
          username,
          email,
          password: rawPassword,
          loginUrl: `${appUrl}/client/login`,
        },
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error("[API /api/clients] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await ensureUserOrg(session.user.id, session.user.email);
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const result = await db.collection(collections.clients).findOneAndUpdate(
      { id, orgId },
      { $set: { ...body, updatedBy: session.user.id, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("[API /api/clients] PUT error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await ensureUserOrg(session.user.id, session.user.email);
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const client = await db.collection(collections.clients).findOne({ id, orgId });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await db.collection(collections.clients).deleteOne({ id, orgId });
    await db.collection(collections.clientUsers).deleteMany({ clientId: id });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API /api/clients] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
