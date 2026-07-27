import { connectDb, mongoose } from "./index.js";
import { v4 as uuid } from "uuid";
import { ClientUser } from "./models/ClientUser.js";
import { Client } from "./models/Client.js";
import { Organization } from "./models/Organization.js";
import { User } from "./models/User.js";
import bcrypt from "bcryptjs";

async function seedClient() {
  await connectDb();

  const demoEmail = "client@demo.io";
  const demoPassword = "Demo@1234";

  const existing = await ClientUser.findOne({ email: demoEmail });
  if (existing) {
    console.log(`Client user already exists: ${demoEmail}`);
    await mongoose.disconnect();
    return;
  }

  const org = await Organization.findOne({}).sort({ createdAt: 1 }).lean();
  if (!org) {
    console.error("No organization found. Run seed-admin or seed first.");
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(demoPassword, 12);
  const clientUserId = uuid();
  const clientId = uuid();

  await Client.create({
    id: clientId,
    orgId: org.id,
    name: "Demo Client",
    email: demoEmail,
    company: "Demo Corp",
    primaryContact: "Demo Client",
    createdByAdminId: "seed",
    createdBy: "seed",
  });

  await ClientUser.create({
    id: clientUserId,
    orgId: org.id,
    clientId,
    username: "demo.client",
    email: demoEmail,
    password: hashedPassword,
    name: "Demo Client",
    isActive: true,
    emailVerified: true,
    mustChangePassword: false,
    createdByAdminId: "seed",
    createdBy: "seed",
  });

  console.log("Demo client seeded successfully!");
  console.log(`Client login URL: /client/login`);
  console.log(`Email: ${demoEmail}`);
  console.log(`Password: ${demoPassword}`);

  await mongoose.disconnect();
}

seedClient().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
