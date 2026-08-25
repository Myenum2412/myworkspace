import mongoose from "mongoose";
import { OrgMember } from "../src/lib/db/models/OrgMember.js";
import { User } from "../src/lib/db/models/User.js";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is required");
  await mongoose.connect(uri);

  const userId = "f0dc122d-dd1f-4891-a00b-633c65dff53a";
  const u = await User.findOne({ id: userId }).lean();
  console.log(
    "By id:",
    u
      ? JSON.stringify({ id: u.id, email: u.email, isActive: u.isActive, role: u.role })
      : "NOT FOUND",
  );

  const email = process.env.USER_EMAIL;
  if (email) {
    const u2 = await User.findOne({ email }).lean();
    console.log(
      "By email:",
      u2
        ? JSON.stringify({ id: u2.id, email: u2.email, isActive: u2.isActive, role: u2.role })
        : "NOT FOUND",
    );
  }

  const orgUsers = await OrgMember.find({ orgId: "4d541b97-4c66-4a7b-8584-4aa41a227896" }).lean();
  for (const m of orgUsers) {
    const user = await User.findOne({ id: m.userId }).lean();
    console.log(
      `OrgMember userId=${m.userId} -> User:`,
      user
        ? JSON.stringify({
            id: user.id,
            email: user.email,
            isActive: user.isActive,
            role: user.role,
          })
        : "NOT FOUND",
    );
  }

  await mongoose.disconnect();
}
main().catch(console.error);
