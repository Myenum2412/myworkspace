import { readFileSync } from "fs";
import { MongoClient } from "mongodb";

const DRY = process.argv.includes("--apply") ? false : true;

const env = readFileSync("/root/myworkspace/backend/.env", "utf8");
const uri = env.match(/^MONGODB_URI=['"]?(.+?)['"]?$/m)[1].trim();
const c = new MongoClient(uri);
await c.connect();
const db = c.db("myworkspace");
const users = db.collection("users");
const members = db.collection("org_members");

// Find every user whose users.orgId does not match its (single) org_members membership.
const all = await users.find({}).project({ id: 1, email: 1, name: 1, orgId: 1, role: 1 }).toArray();
let fixes = 0;
for (const u of all) {
  const ms = await members.find({ userId: u.id }).toArray();
  const orgIds = [...new Set(ms.map((m) => m.orgId?.toString()).filter(Boolean))];
  // Only reconcile when exactly one unambiguous org membership exists.
  if (orgIds.length !== 1) continue;
  const membershipOrg = orgIds[0];
  const userOrg = u.orgId ? String(u.orgId) : null;
  if (userOrg === membershipOrg) continue;
  fixes++;
  console.log(
    JSON.stringify({
      action: DRY ? "DRY-RUN (would update)" : "APPLIED",
      email: u.email,
      role: u.role,
      _: u.id,
      before: userOrg || "<empty>",
      after: membershipOrg,
    }),
  );
  if (!DRY) {
    await users.updateOne({ _id: u._id }, { $set: { orgId: membershipOrg } });
  }
}
console.log(
  `\n${DRY ? "[DRY-RUN] would fix" : "[APPLIED] fixed"} ${fixes} user(s). Re-run with --apply to write.`,
);
await c.close();
