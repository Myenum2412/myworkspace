const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/myworkspace";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    console.log("--- Users ---");
    const user = await db.collection("users").findOne({ email: "myenumam@gmail.com" });
    console.log(user);

    console.log("--- Client Users ---");
    const cUser = await db.collection("client_users").findOne({ email: "myenumam@gmail.com" });
    console.log(cUser);
  } finally {
    await client.close();
  }
}
run().catch(console.error);
