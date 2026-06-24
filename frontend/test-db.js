const { MongoClient } = require("mongodb");
async function run() {
  const uri = "mongodb+srv://workmyspace2412_db_user:aREoh3wCAz0j6agO@cluster0.hvtabns.mongodb.net/?appName=Cluster0";
  const client = await MongoClient.connect(uri);
  const db = client.db("myworkspace");
  const users = await db.collection("users").find({}).toArray();
  console.log("Users:", users.map(u => ({ id: u.id, email: u.email, name: u.name })));
  client.close();
}
run().catch(console.error);
