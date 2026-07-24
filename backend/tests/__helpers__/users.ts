import mongoose from "mongoose";
import { v4 as uuid } from "uuid";
import { User } from "../../src/lib/db/models/User.js";
import { Organization } from "../../src/lib/db/models/Organization.js";
import { OrgMember } from "../../src/lib/db/models/OrgMember.js";
import { hash } from "bcryptjs";
import { signToken } from "../../src/config/auth.js";

/**
 * Seed an org with an admin user directly (bypasses mail + throttling concerns
 * in tests via direct Mongo insert). Returns a JWT-bearing token payload for
 * use in Authorization headers. This is a TEST-ONLY helper.
 */
export async function seedOrgWithAdmin(opts: {
  email: string;
  name?: string;
  password?: string;
}): Promise<{ userId: string; orgId: string; email: string; headers: Record<string, string> }> {
  const userId = uuid();
  const orgId = uuid();
  const name = opts.name || "Tester";
  const email = opts.email.toLowerCase();
  const password = opts.password || "password123";

  await User.create({
    id: userId,
    name,
    email,
    password: await hash(password, 10),
    status: "online",
    role: "members",
    orgId,
    userNumber: Math.floor(Math.random() * 900000) + 100000,
    createdBy: userId,
  });
  await Organization.create({ id: orgId, name: `${name}'s Org`, slug: `slug-${userId.slice(0, 8)}`, plan: "free", ownerId: userId, createdBy: userId });
  await OrgMember.create({ orgId, userId, role: "members", createdBy: userId });

  const token = signToken({ userId, email, role: "members", permissions: [], orgId });
  return { userId, orgId, email, headers: { Authorization: `Bearer ${token}` } };
}

// Keep imports referenced for tree-shaking clarity.
void mongoose;
void uuid;
