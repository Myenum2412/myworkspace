import mongoose from "mongoose";
import { Task } from "../src/lib/db/models/Task.js";
import { OrgMember } from "../src/lib/db/models/OrgMember.js";
import { User } from "../src/lib/db/models/User.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  const tasks = await Task.find({ orgId: "4fcf95d1-9f17-4a0f-95b9-d625c2f562d2" }).lean();
  console.log(`Tasks: ${tasks.length}`);
  for (const t of tasks) {
    console.log(`  title="${t.title}" status=${t.status} assigneeId=${t.assigneeId}`);
  }
  
  const members = await OrgMember.find({ orgId: "4fcf95d1-9f17-4a0f-95b9-d625c2f562d2" }).lean();
  console.log(`\nOrgMembers: ${members.length}`);
  for (const m of members) {
    const u = await User.findOne({ id: m.userId }).lean();
    console.log(`  userId=${m.userId} user=${u?.email || "NOT FOUND"} role=${m.role}`);
  }
  
  // Check if org exists in Organization collection
  const orgs = mongoose.connection.db.collection("organizations");
  const org = await orgs.findOne({ id: "4fcf95d1-9f17-4a0f-95b9-d625c2f562d2" });
  console.log(`\nOrganization doc:`, org ? JSON.stringify({id: org.id, name: org.name}) : "NOT FOUND");
  
  await mongoose.disconnect();
}
main().catch(console.error);
