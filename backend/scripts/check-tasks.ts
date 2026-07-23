import mongoose from "mongoose";
import { Task } from "../src/lib/db/models/Task.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const tasks = await Task.find({ orgId: "4d541b97-4c66-4a7b-8584-4aa41a227896", assigneeId: "f0dc122d-dd1f-4891-a00b-633c65dff53a" }).lean();
  console.log("Tasks for myenumam:", tasks.length);
  const all = await Task.find({ orgId: "4d541b97-4c66-4a7b-8584-4aa41a227896" }).lean();
  for (const t of all) {
    console.log(`  task=${t.id || t._id} title=${t.title} status=${t.status} assigneeId=${t.assigneeId}`);
  }
  await mongoose.disconnect();
}
main().catch(console.error);
