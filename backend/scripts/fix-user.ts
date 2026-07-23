import mongoose from "mongoose";
import { User } from "../src/lib/db/models/User.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  const result = await User.updateOne(
    { email: "myenumam@gmail.com" },
    { $set: { isActive: true } }
  );
  console.log("Updated:", result.modifiedCount, "matched:", result.matchedCount);
  
  // Also fix any other users missing isActive
  const fixed = await User.updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } }
  );
  console.log("Fixed other users without isActive:", fixed.modifiedCount, "matched:", fixed.matchedCount);
  
  // Also fix the task that's in "draft" status - it won't show up in query
  // because the scheduler filters status $nin: ["completed", "cancelled", "closed"]
  // Draft tasks ARE included though, so that's fine.
  
  const u = await User.findOne({ email: "myenumam@gmail.com" }).lean();
  console.log("User now:", JSON.stringify({id: u?.id, email: u?.email, isActive: u?.isActive}));
  
  await mongoose.disconnect();
}
main().catch(console.error);
