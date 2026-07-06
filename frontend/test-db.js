const { MongoClient } = require("mongodb");

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/myworkspace";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const invoices = await db.collection("invoices").find({}).toArray();
    console.log("Invoices count:", invoices.length);
    if (invoices.length > 0) {
      console.log("Sample invoice:", JSON.stringify(invoices[0], null, 2));
    }
  } finally {
    await client.close();
  }
}

run().catch(console.error);
