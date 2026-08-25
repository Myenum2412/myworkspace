import mongoose from "mongoose";
import { User } from "../src/lib/db/models/User.js";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is required");
  await mongoose.connect(uri);

  const email = process.env.USER_EMAIL;
  if (!email) throw new Error("USER_EMAIL environment variable is required");

  const result = await User.updateOne({ email }, { $set: { isActive: true } });
  console.log("Updated:", result.modifiedCount, "matched:", result.matchedCount);

  // Also fix any other users missing isActive
  const fixed = await User.updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } },
  );
  console.log(
    "Fixed other users without isActive:",
    fixed.modifiedCount,
    "matched:",
    fixed.matchedCount,
  );

  // Also fix the task that's in "draft" status - it won't show up in query
  // because the scheduler filters status $nin: ["completed", "cancelled", "closed"]
  // Draft tasks ARE included though, so that's fine.

  const u = await User.findOne({ email }).lean();
  console.log("User now:", JSON.stringify({ id: u?.id, email: u?.email, isActive: u?.isActive }));

  await mongoose.disconnect();
}
main().catch(console.error);
