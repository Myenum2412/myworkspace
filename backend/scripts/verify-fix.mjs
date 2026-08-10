import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const uri = readFileSync("/root/myworkspace/backend/.env", "utf8")
  .match(/^MONGODB_URI=['"]?(.+?)['"]?$/m)[1]
  .trim();
const c = new MongoClient(uri);
await c.connect();
const db = c.db("myworkspace");
const email = process.env.USER_EMAIL;
if (!email) throw new Error("USER_EMAIL environment variable is required");
const u = await db.collection("users").findOne({ email });
const m = await db.collection("org_members").findOne({ userId: u.id });
console.log("users.orgId  :", u.orgId);
console.log("org_members  :", m ? m.orgId : "(none)");
console.log("MATCH        :", u.orgId && m && String(u.orgId) === String(m.orgId));
await c.close();
