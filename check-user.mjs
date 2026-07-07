import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
const env = readFileSync("/var/www/myworkspace-backend/source/backend/.env", "utf8");
const m = env.match(/^MONGODB_URI=['"]?(.+?)['"]?$/m);
const uri = m ? m[1].trim() : null;
if (!uri) { console.error("MONGODB_URI not found"); process.exit(1); }
console.log("Connecting...");
const c = new MongoClient(uri);
await c.connect();
const coll = c.db("myworkspace").collection("users");
const u = await coll.findOne({ email: "developer@myenum.in" });
if (u) {
  console.log(JSON.stringify({
    _id: u._id, email: u.email, name: u.name, orgId: u.orgId,
    role: u.role, status: u.status, hasPassword: !!u.password,
    isActive: u.isActive, twoFactorEnabled: u.twoFactorEnabled
  }, null, 2));
} else {
  console.log("User not found");
}
await c.close();
