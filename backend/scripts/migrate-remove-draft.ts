import mongoose from "mongoose";
import { Task } from "../src/lib/db/models/Task.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  // Tasks with type "draft" → convert to "individual" with status "assigned"
  const typeDraft = await Task.updateMany(
    { type: "draft" },
    { $set: { type: "individual", status: "assigned" } }
  );
  console.log(`type "draft" → individual/assigned: ${typeDraft.modifiedCount} updated (${typeDraft.matchedCount} matched)`);

  // Tasks with status "draft" (any type) → convert to "assigned"
  const statusDraft = await Task.updateMany(
    { status: "draft" },
    { $set: { status: "assigned" } }
  );
  console.log(`status "draft" → "assigned": ${statusDraft.modifiedCount} updated (${statusDraft.matchedCount} matched)`);

  await mongoose.disconnect();
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
