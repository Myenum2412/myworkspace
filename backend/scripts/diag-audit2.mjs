import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
const env = readFileSync("/root/myworkspace/backend/.env","utf8");
const uri = env.match(/^MONGODB_URI=['"]?(.+?)['"]?$/m)[1].trim();
const c = new MongoClient(uri); await c.connect();
const db = c.db("myworkspace");
console.log("COLLECTIONS:", (await db.listCollections().toArray()).map(x=>x.name).join(", "));
for (const coll of ["auditlogs","TENANCYONENC","tenantisolation"]) {
  try { console.log(coll, await db.collection(coll).countDocuments()); } catch(e){}
}
// list any collection with 'audit' or 'tenant' in name
const names = (await db.listCollections().toArray()).map(x=>x.name);
for (const n of names) if (/audit|log|tenant|isolation/i.test(n)) console.log("MATCH COLL:", n);
await c.close();
