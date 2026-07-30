import { connectDb, mongoose } from "./index.js";
import { v4 as uuid } from "uuid";
import { User } from "./models/User.js";
import { ClientUser } from "./models/ClientUser.js";
import { Client } from "./models/Client.js";
import { Organization } from "./models/Organization.js";
import { OrgMember } from "./models/OrgMember.js";
import { Counter } from "./models/Counter.js";
import bcrypt from "bcryptjs";

const STAFF_USERS = [
  { name: "Pallath Arjun", email: "pallatharjun119@gmail.com", password: "So-Different06", role: "staffs" },
  { name: "Arjun Jilla", email: "arjunjilla119@gmail.com", password: "As_you_wish06", role: "staffs" },
  { name: "Nisha Kerala", email: "nishakerala2003@gmail.com", password: "kerala_nisha_2412", role: "staffs" },
];

const CLIENT_USERS = [
  { name: "Arjun V", email: "arjunv110688862@gmail.com", password: "@p_arjun1106" },
  { name: "Devassemble Arjun", email: "arjun11068862@gmail.com", password: "@DEVASSEMBLE_ARJUN" },
  { name: "MyEnum Developer", email: "developermyenum@gmail.com", password: "@IM_MYENUM2412" },
];

async function seedAllUsers() {
  await connectDb();

  const existingStaff = await User.findOne({ email: STAFF_USERS[0].email });
  if (existingStaff) {
    console.log("Staff users already exist. Clearing and recreating all users...");
  }

  await Promise.all([
    User.deleteMany({ email: { $in: STAFF_USERS.map(u => u.email) } }),
    ClientUser.deleteMany({ email: { $in: CLIENT_USERS.map(u => u.email) } }),
    Client.deleteMany({ email: { $in: CLIENT_USERS.map(u => u.email) } }),
  ]);

  let org = await Organization.findOne({}).sort({ createdAt: 1 }).lean();
  let targetOrgId = org?.id || org?._id?.toString();

  if (!targetOrgId) {
    const newOrgId = uuid();
    await Organization.create({
      id: newOrgId,
      name: "MyWorkSpace Users",
      slug: "myworkspace-users",
      plan: "enterprise",
      ownerId: "seed",
      createdBy: "seed",
    });
    targetOrgId = newOrgId;
  }

  let seq = await Counter.findOneAndUpdate(
    { name: "userNumber" },
    { $inc: { seq: STAFF_USERS.length + CLIENT_USERS.length } },
    { new: true, upsert: true }
  );
  let userNumber = seq!.seq;

  console.log("Seeding staff users...");
  for (const u of STAFF_USERS) {
    const hashedPassword = await bcrypt.hash(u.password, 12);
    const userId = uuid();

    await User.create({
      id: userId,
      userNumber: userNumber++,
      orgId: targetOrgId,
      name: u.name,
      email: u.email,
      emailVerified: true,
      password: hashedPassword,
      status: "offline",
      role: u.role,
      isActive: true,
      failedLoginAttempts: 0,
      tokenVersion: 0,
      permissions: [],
      createdBy: "seed",
    });

    await OrgMember.create({
      orgId: targetOrgId,
      userId,
      role: u.role,
      joinedAt: new Date(),
      createdBy: "seed",
    });

    console.log(`  ✓ ${u.email} / ${u.password} (role: ${u.role})`);
  }

  console.log("Seeding client users...");
  for (const u of CLIENT_USERS) {
    const hashedPassword = await bcrypt.hash(u.password, 12);
    const clientUserId = uuid();
    const clientId = uuid();

    await Client.create({
      id: clientId,
      orgId: targetOrgId,
      clientUserId,
      name: u.name,
      email: u.email,
      company: u.name,
      primaryContact: u.name,
      createdByAdminId: "seed",
      createdBy: "seed",
    });

    await ClientUser.create({
      id: clientUserId,
      orgId: targetOrgId,
      clientId,
      username: u.email.split("@")[0],
      email: u.email,
      password: hashedPassword,
      name: u.name,
      isActive: true,
      emailVerified: true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      tokenVersion: 0,
      createdByAdminId: "seed",
      createdBy: "seed",
    });

    console.log(`  ✓ ${u.email} / ${u.password} (client)`);
  }

  console.log("\n✨ All users seeded successfully!");
  console.log("\nStaff panel login (3 users):");
  STAFF_USERS.forEach(u => console.log(`  ${u.email} / ${u.password}`));
  console.log("\nClient panel login (3 users):");
  CLIENT_USERS.forEach(u => console.log(`  ${u.email} / ${u.password}`));
  console.log(`\nOrg ID: ${targetOrgId}`);

  await mongoose.disconnect();
}

seedAllUsers().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
