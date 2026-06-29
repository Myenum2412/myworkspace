import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "./frontend/.env") });
import { db } from "./frontend/lib/db/index.js";
async function run() {
  const folders = await db.collection("folders").find({}).toArray();
  console.log("Total folders:", folders.length);
  console.log("Root folders:", folders.filter(f => f.parentId === null).length);
  console.log("Client folders:", folders.filter(f => f.clientId !== null).length);
  process.exit(0);
}
run().catch(console.error);
