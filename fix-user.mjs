import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";
const env = readFileSync("/var/www/myworkspace-backend/source/backend/.env", "utf8");
const m = env.match(/^MONGODB_URI=['"]?(.+?)['"]?$/m);
const uri = m ? m[1].trim() : null;
if (!uri) { console.error("MONGODB_URI not found"); process.exit(1); }
const c = new MongoClient(uri);
await c.connect();
const db = c.db("myworkspace");

const user = await db.collection("users").findOne({ email: "developer@myenum.in" });
console.log("Current user:", JSON.stringify({ _id: user._id, email: user.email, orgId: user.orgId, name: user.name }));

const org = await db.collection("organizations").findOne({ _id: new ObjectId("6a37d3bd1032bb9fb9ed2251") });
console.log("Org found:", !!org);

const members = await db.collection("orgmembers").find({ userId: user._id.toString() }).toArray();
console.log("OrgMember records:", members.length, members.map(m => ({ orgId: m.orgId, userId: m.userId, role: m.role })));

if (!user.orgId) {
  await db.collection("users").updateOne(
    { _id: user._id },
    { $set: { orgId: "6a37d3bd1032bb9fb9ed2251" } }
  );
  const updated = await db.collection("users").findOne({ _id: user._id });
  console.log("Updated orgId:", updated.orgId);
} else {
  console.log("orgId already set:", user.orgId);
}

await c.close();
