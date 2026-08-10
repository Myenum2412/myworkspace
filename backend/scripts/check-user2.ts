import mongoose from "mongoose";
import { User } from "../src/lib/db/models/User.js";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is required");
  await mongoose.connect(uri);
  const email = process.env.USER_EMAIL;
  if (!email) throw new Error("USER_EMAIL environment variable is required");
  const u = await User.findOne({ email }).lean();
  console.log("Full doc:", JSON.stringify(u, null, 2));
  await mongoose.disconnect();
}
main().catch(console.error);
