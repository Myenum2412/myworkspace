import { readFileSync } from "fs";
import { MongoClient } from "mongodb";

const env = readFileSync("/root/myworkspace/backend/.env", "utf8");
const m = env.match(/^MONGODB_URI=['"]?(.+?)['"]?$/m);
const uri = m ? m[1].trim() : null;
if (!uri) {
  console.error("MONGODB_URI not found");
  process.exit(1);
}

const c = new MongoClient(uri);
await c.connect();
const db = c.db("myworkspace");
const log = (...a) => console.log(...a);

// 1. Users whose users.orgId disagrees with their OrgMember record(s)
log("=== USERS orgId vs OrgMembers mismatch ===\n");
const users = await db
  .collection("users")
  .find({})
  .project({ email: 1, name: 1, orgId: 1, role: 1, status: 1, isActive: 1 })
  .toArray();
let mismatchCount = 0;
for (const u of users) {
  const members = await db.collection("orgmembers").find({ userId: u._id.toString() }).toArray();
  const memberOrgs = [...new Set(members.map((m) => m.orgId?.toString()))];
  const userOrg = u.orgId?.toString();
  const memberOrg = members.length ? memberOrgs[0] : null;
  if (
    (userOrg && memberOrg && userOrg !== memberOrg) ||
    (!userOrg && memberOrg) ||
    (userOrg && members.length === 0)
  ) {
    mismatchCount++;
    log(
      `- ${u.email || u._id}: users.orgId=${userOrg || "<none>"} | orgmembers=${memberOrgs.join(",") || "<none>"} role=${u.role} active=${u.isActive} status=${u.status}`,
    );
  }
}
log(`\nTotal users with org inconsistency: ${mismatchCount} / ${users.length}\n`);

// 2. Task orgId distribution
log("=== Task orgId counts ===\n");
try {
  const taskOrgs = await db
    .collection("tasks")
    .aggregate([{ $group: { _id: "$orgId", n: { $sum: 1 } } }, { $sort: { n: -1 } }])
    .toArray();
  log(JSON.stringify(taskOrgs));
} catch (e) {
  log("tasks agg err", e.message);
}

// 3. organizations identity
log("\n=== Organizations ===\n");
const orgs = await db.collection("organizations").find({}).project({ name: 1, _id: 1 }).toArray();
log(JSON.stringify(orgs));

await c.close();
