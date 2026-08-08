import { readFileSync } from "fs";
import { MongoClient } from "mongodb";

const env = readFileSync("/root/myworkspace/backend/.env", "utf8");
const uri = env.match(/^MONGODB_URI=['"]?(.+?)['"]?$/m)[1].trim();
const c = new MongoClient(uri);
await c.connect();
const db = c.db("myworkspace");
const staff = await db.collection("users").findOne({ email: "pallatharjun119@gmail.com" });
const sid = staff._id.toString();
console.log(
  "STAFF",
  JSON.stringify({
    _id: staff._id,
    id: staff.id,
    email: staff.email,
    orgId: staff.orgId,
    role: staff.role,
  }),
);
console.log("\norg_members sample (2):");
const ms = await db.collection("org_members").find({}).limit(2).toArray();
for (const m of ms) console.log(JSON.stringify(m, null, 1));
console.log("\nTASKS assigned/created by staff:");
const tasks = await db
  .collection("tasks")
  .find({})
  .project({ title: 1, orgId: 1, assigneeId: 1, creatorId: 1, _id: 0 })
  .toArray();
let found = 0;
for (const t of tasks) {
  if (
    [t.assigneeId, t.creatorId].some((x) => x === sid) ||
    [t.assigneeId, t.creatorId].some((x) => x === staff.id)
  ) {
    console.log(
      JSON.stringify({
        title: (t.title || "").slice(0, 30),
        orgId: t.orgId,
        assigneeId: t.assigneeId,
        creatorId: t.creatorId,
      }),
    );
    found++;
  }
}
console.log("staff-referenced tasks:", found, "/ total", tasks.length);
console.log(
  "\nlast login / created of this user:",
  JSON.stringify({ createdAt: staff.createdAt, lastLogin: staff.lastLogin }),
);
await c.close();
