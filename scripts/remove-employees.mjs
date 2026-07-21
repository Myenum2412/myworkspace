import { MongoClient } from "mongodb";

const uri = "mongodb+srv://workmyspace2412_db_user:aREoh3wCAz0j6agO@cluster0.hvtabns.mongodb.net/?appName=Cluster0";
const dbName = "myworkspace";

const employeeRoles = ["staffs", "members", "hr"];

async function removeEmployees() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    // Find all employee user IDs
    const employeeUsers = await db.collection("users").find(
      { role: { $in: employeeRoles } },
      { projection: { id: 1, _id: 1 } }
    ).toArray();

    const userIds = employeeUsers.map(u => u.id);
    const objectIds = employeeUsers.map(u => u._id);

    console.log(`Found ${userIds.length} employee records to remove`);

    if (userIds.length === 0) {
      console.log("No employee data found.");
      return;
    }

    // Remove from all related collections
    const results = await Promise.all([
      db.collection("users").deleteMany({ role: { $in: employeeRoles } }),
      db.collection("org_members").deleteMany({ userId: { $in: userIds } }),
      db.collection("work_experience").deleteMany({ userId: { $in: userIds } }),
      db.collection("education_details").deleteMany({ userId: { $in: userIds } }),
      db.collection("dependent_details").deleteMany({ userId: { $in: userIds } }),
    ]);

    console.log("Cleanup complete:");
    console.log(`  users:          ${results[0].deletedCount} deleted`);
    console.log(`  org_members:    ${results[1].deletedCount} deleted`);
    console.log(`  work_experience:${results[2].deletedCount} deleted`);
    console.log(`  education_details:${results[3].deletedCount} deleted`);
    console.log(`  dependent_details:${results[4].deletedCount} deleted`);

  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

removeEmployees();
