import { connectDb, mongoose } from "./index.js";
import { User } from "./models/User.js";
import { Organization } from "./models/Organization.js";
import { OrgMember } from "./models/OrgMember.js";
import { ActivityLog } from "./models/ActivityLog.js";
import { env } from "../../config/env.js";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  await connectDb();

  const email = env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD || "change-me-immediately";
  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    await mongoose.disconnect();
    return;
  }

  const admin = await User.create({
    name: "Super Admin",
    email,
    emailVerified: true,
    password: hashedPassword,
    status: "offline",
    role: "ORG_MENU_ADMIN",
    permissions: [
      "VIEW_ORGMENU",
      "MANAGE_USERS",
      "MANAGE_WORKSPACES",
      "MANAGE_COMPANIES",
      "MANAGE_BILLING",
      "VIEW_SYSTEM_LOGS",
      "MANAGE_ROLES",
      "MANAGE_SETTINGS",
      "MANAGE_SUBSCRIPTIONS",
    ],
    isActive: true,
    failedLoginAttempts: 0,
    twoFactorEnabled: false,
  });

  const org = await Organization.create({
    name: "System Administration",
    slug: "system-admin",
    plan: "enterprise",
  });

  await OrgMember.create({
    orgId: org._id,
    userId: admin._id,
    role: "admin",
    joinedAt: new Date(),
  });

  await ActivityLog.create({
    orgId: org._id,
    userId: admin._id,
    action: "admin.seeded",
    entityType: "user",
    entityId: admin._id.toString(),
    description: "Super Admin account created",
  });

  console.log("Super Admin seeded successfully!");
  console.log(`Email: ${email}`);
  console.log(`Role: ORG_MENU_ADMIN`);
  console.log(`Permissions: ${admin.permissions.join(", ")}`);

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
