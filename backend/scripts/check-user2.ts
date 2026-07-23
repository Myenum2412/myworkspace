import mongoose from "mongoose";
import { User } from "../src/lib/db/models/User.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const u = await User.findOne({ email: "myenumam@gmail.com" }).lean();
  console.log("Full doc:", JSON.stringify(u, null, 2));
  await mongoose.disconnect();
}
main().catch(console.error);
