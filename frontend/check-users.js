const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config({ path: "./frontend/.env" });
async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/myworkspace";
  const client = await MongoClient.connect(uri);
  const db = client.db();
  const users = await db.collection("users").find().toArray();
  console.log(users.map(u => ({ id: u.id, _id: u._id, email: u.email, name: u.name })));
  client.close();
}
run().catch(console.error);
