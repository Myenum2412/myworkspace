import { MongoClient } from "mongodb";

async function migrate() {
  const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017/myworkspace");

  try {
    await client.connect();
    const db = client.db();

    // Fix existing users with null userNumber
    const usersWithoutNumber = await db
      .collection("users")
      .find({ userNumber: null })
      .sort({ createdAt: 1 })
      .toArray();

    console.log(`Found ${usersWithoutNumber.length} users with null userNumber`);

    // Get current max userNumber
    const maxUser = await db
      .collection("users")
      .findOne({ userNumber: { $ne: null } }, { sort: { userNumber: -1 } });

    let nextNumber = (maxUser?.userNumber || 0) + 1;

    for (const user of usersWithoutNumber) {
      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { userNumber: nextNumber } }
      );
      console.log(`Updated user ${user.email} with userNumber ${nextNumber}`);
      nextNumber++;
    }

    // Update the counter to reflect the new max
    await db.collection("counters").updateOne(
      { name: "userNumber" },
      { $set: { seq: nextNumber - 1 } },
      { upsert: true }
    );

    console.log(`Migration complete. Next userNumber will be ${nextNumber}`);
  } finally {
    await client.close();
  }
}

migrate().catch(console.error);
