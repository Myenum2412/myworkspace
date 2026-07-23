import mongoose from "mongoose";
import { User } from "../src/lib/db/models/User.js";
import { OrgMember } from "../src/lib/db/models/OrgMember.js";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  const userId = "f0dc122d-dd1f-4891-a00b-633c65dff53a";
  const u = await User.findOne({ id: userId }).lean();
  console.log("By id:", u ? JSON.stringify({id: u.id, email: u.email, isActive: u.isActive, role: u.role}) : "NOT FOUND");
  
  const u2 = await User.findOne({ email: "myenumam@gmail.com" }).lean();
  console.log("By email:", u2 ? JSON.stringify({id: u2.id, email: u2.email, isActive: u2.isActive, role: u2.role}) : "NOT FOUND");

  const orgUsers = await OrgMember.find({ orgId: "4d541b97-4c66-4a7b-8584-4aa41a227896" }).lean();
  for (const m of orgUsers) {
    const user = await User.findOne({ id: m.userId }).lean();
    console.log(`OrgMember userId=${m.userId} -> User:`, user ? JSON.stringify({id: user.id, email: user.email, isActive: user.isActive, role: user.role}) : "NOT FOUND");
  }
  
  await mongoose.disconnect();
}
main().catch(console.error);
