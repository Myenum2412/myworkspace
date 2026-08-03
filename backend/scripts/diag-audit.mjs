import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
const env = readFileSync("/root/myworkspace/backend/.env", "utf8");
const m = env.match(/^MONGODB_URI=['"]?(.+?)['"]?$/m);
const uri = m ? m[1].trim() : null;
const c = new MongoClient(uri);
await c.connect();
const db = c.db("myworkspace");
const logs = await db.collection("auditlogs").find({
  $or: [
    { action: /tenant\.isolation/ },
    { description: /organization mismatch|belongs to another/i },
  ],
  createdAt: { $gte: new Date(Date.now() - 60*24*60*60*1000) },
}).sort({ createdAt: -1 }).limit(40).toArray();
console.log("AUDIT LOGS (isolations):", logs.length);
for (const l of logs) {
  console.log(JSON.stringify({
    at: l.createdAt, orgId: l.orgId, userId: l.userId, action: l.action,
    desc: (l.description||"").slice(0,160),
    meta: l.metadata,
  }));
}
await c.close();