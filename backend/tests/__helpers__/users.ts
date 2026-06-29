import mongoose from "mongoose";
import { v4 as uuid } from "uuid";

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
  // Lazy imports keep startup cheap and avoid side effects on import.
  const { User } = await import("../../../src/lib/db/models/User.js");
  const { Organization } = await import("../../../src/lib/db/models/Organization.js");
  const { OrgMember } = await import("../../../src/lib/db/models/OrgMember.js");
  const { hash } = await import("bcryptjs");
  const { signToken } = await import("../../../src/config/auth.js");

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
    role: "admin",
    orgId,
  });
  await Organization.create({ id: orgId, name: `${name}'s Org`, slug: `slug-${userId.slice(0, 8)}`, plan: "starter", ownerId: userId });
  await OrgMember.create({ orgId, userId, role: "admin" });

  const token = signToken({ userId, email, role: "admin", permissions: [], orgId });
  return { userId, orgId, email, headers: { Authorization: `Bearer ${token}` } };
}

// Keep imports referenced for tree-shaking clarity.
void mongoose;
void uuid;
