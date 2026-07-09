const { MongoClient, ObjectId } = require('mongodb');
async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    let orgId = "4fcf95d1-9f17-4a0f-95b9-d625c2f562d2"; // Myenum Am's Org
    let dbOrg = await db.collection('organizations').findOne({ id: orgId });
    let orgDocId = null;
    
    if (dbOrg) {
      orgDocId = dbOrg._id;
    } else {
      try {
        if (ObjectId.isValid(orgId)) {
          dbOrg = await db.collection('organizations').findOne({ _id: new ObjectId(orgId) });
        } else {
          dbOrg = await db.collection('organizations').findOne({ _id: orgId });
        }
      } catch {}
      if (dbOrg) orgDocId = dbOrg._id;
    }
    
    if (dbOrg && orgDocId) {
      const orgUpdates = { companyEmail: "script-test-email@example.com" };
      const orgRes = await db.collection('organizations').updateOne({ _id: orgDocId }, { \$set: orgUpdates });
      console.log(`Matched: \${orgRes.matchedCount}, Modified: \${orgRes.modifiedCount}`);
    } else {
      console.log("No org found");
    }
  } finally {
    await client.close();
  }
}
run().catch(console.error);
