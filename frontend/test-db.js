import { MongoClient } from "mongodb";
const uri = "mongodb+srv://workmyspace2412_db_user:aREoh3wCAz0j6agO@cluster0.hvtabns.mongodb.net/?appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("myworkspace");
    const users = await db.collection("users").find({}).toArray();
    console.log("Users:", JSON.stringify(users, null, 2));
    
    const orgMembers = await db.collection("org_members").find({}).toArray();
    console.log("Org Members:", JSON.stringify(orgMembers, null, 2));

    const orgs = await db.collection("organizations").find({}).toArray();
    console.log("Orgs:", JSON.stringify(orgs, null, 2));
  } finally {
    await client.close();
  }
}
run().catch(console.error);
