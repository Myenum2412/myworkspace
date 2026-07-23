import { connectDb, mongoose } from "./index.js";
import { v4 as uuid } from "uuid";
import { User } from "./models/User.js";
import { Organization } from "./models/Organization.js";
import { OrgMember } from "./models/OrgMember.js";
import { ActivityLog } from "./models/ActivityLog.js";
import { Counter } from "./models/Counter.js";
import { env } from "../../config/env.js";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  await connectDb();

  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD environment variable is required for seeding");
  }
  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    await mongoose.disconnect();
    return;
  }

  const userId = uuid();
  const orgId = uuid();

  const admin = await User.create({
    id: userId,
    userNumber: 1,
    orgId,
    name: "Super Admin",
    email,
    emailVerified: true,
    password: hashedPassword,
    status: "offline",
    role: "org_admin",
    permissions: [],
    isActive: true,
    failedLoginAttempts: 0,
  });

  const org = await Organization.create({
    id: orgId,
    name: "System Administration",
    slug: "system-admin",
    plan: "enterprise",
    ownerId: userId,
  });

  await OrgMember.create({
    orgId,
    userId,
    role: "members",
    joinedAt: new Date(),
  });

  await Counter.create({ name: "userNumber", seq: 1 });

  await ActivityLog.create({
    orgId: org.id,
    userId: admin.id,
    createdBy: admin.id,
    action: "admin.seeded",
    entityType: "user",
    entityId: admin.id,
    description: "Super Admin account created",
  });

  console.log("Super Admin seeded successfully!");
  console.log(`Email: ${email}`);
  console.log(`Role: org_admin`);
  console.log(`Permissions: ${admin.permissions.join(", ")}`);

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
