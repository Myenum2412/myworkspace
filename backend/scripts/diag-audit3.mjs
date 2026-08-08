import { readFileSync } from "fs";
import { MongoClient } from "mongodb";

const env = readFileSync("/root/myworkspace/backend/.env", "utf8");
const uri = env.match(/^MONGODB_URI=['"]?(.+?)['"]?$/m)[1].trim();
const c = new MongoClient(uri);
await c.connect();
const db = c.db("myworkspace");
const logs = await db.collection("auditlogs").find({}).sort({ createdAt: -1 }).limit(20).toArray();
console.log("LATEST AUDITLOGS:");
for (const l of logs)
  console.log(
    JSON.stringify({
      at: l.createdAt,
      orgId: l.orgId,
      userId: l.userId,
      action: l.action,
      desc: (l.description || "").slice(0, 110),
    }),
  );
const ok = await db.collection("org_members").countDocuments();
console.log("org_members count:", ok);
const staffs = await db.collection("users").find({ role: "staffs" }).toArray();
console.log("STAFFS:");
for (const u of staffs)
  console.log(
    JSON.stringify({
      id: u.id,
      email: u.email,
      orgId: u.orgId,
      role: u.role,
      _id: u._id.toString(),
    }),
  );
console.log("MEMBER RECORDS for staff users:");
for (const u of staffs) {
  const ms = await db.collection("org_members").find({ userId: u._id.toString() }).toArray();
  console.log(u.email, "->", ms.map((m) => `{orgId:${m.orgId},role:${m.role}}`).join(", "));
}
await c.close();
