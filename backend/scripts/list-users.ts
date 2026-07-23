import mongoose from "mongoose";
import { User } from "../src/lib/db/models/User.js";
import { OrgMember } from "../src/lib/db/models/OrgMember.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  const users = await User.find({}).sort({ createdAt: 1 }).lean();
  console.log(`Total users: ${users.length}\n`);
  console.log("ID\t\t\t\t\tEMAIL\t\t\t\tROLE\t\tACTIVE\tORGID");
  console.log("-".repeat(120));
  for (const u of users) {
    console.log(`${(u as any).id}\t${(u as any).email}\t${(u as any).role}\t${(u as any).isActive}\t${(u as any).orgId || "none"}`);
  }
  
  console.log("\n\nOrg memberships:");
  const members = await OrgMember.find({}).lean();
  for (const m of members) {
    const u = await User.findOne({ id: m.userId }).lean();
    console.log(`  user=${m.userId} (${u?.email || "unknown"}) org=${m.orgId} role=${m.role}`);
  }
  
  await mongoose.disconnect();
}
main().catch(console.error);
