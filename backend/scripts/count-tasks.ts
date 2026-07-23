import mongoose from "mongoose";
import { Task } from "../src/lib/db/models/Task.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  const total = await Task.countDocuments({});
  const byOrg = await Task.aggregate([
    { $group: { _id: "$orgId", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  const byStatus = await Task.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  console.log(`Total tasks: ${total}\n`);
  console.log("By org:");
  for (const o of byOrg) console.log(`  ${o._id || "none"}: ${o.count}`);
  console.log("\nBy status:");
  for (const s of byStatus) console.log(`  ${s._id}: ${s.count}`);
  
  await mongoose.disconnect();
}
main().catch(console.error);
