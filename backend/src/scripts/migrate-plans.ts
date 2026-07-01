import { connectDb, mongoose } from "../lib/db/index.js";
import { StorageQuota, getPlanLimits } from "../lib/db/models/StorageQuota.js";

async function migratePlans() {
  await connectDb();
  const db = mongoose.connection.db;
  if (!db) { console.error("No DB connection"); process.exit(1); }

  // 1. Update organizations: "starter" → "free", "pro" → "growth"
  const starterResult = await db.collection("organizations").updateMany(
    { plan: "starter" },
    { $set: { plan: "free" } }
  );
  console.log(`[migrate] Updated ${starterResult.modifiedCount} orgs: starter → free`);

  const proResult = await db.collection("organizations").updateMany(
    { plan: "pro" },
    { $set: { plan: "growth" } }
  );
  console.log(`[migrate] Updated ${proResult.modifiedCount} orgs: pro → growth`);

  // 2. Create StorageQuota entries for orgs that don't have one
  const orgsWithoutQuota = await db.collection("organizations").aggregate([
    {
      $lookup: {
        from: "storagequotas",
        localField: "_id",
        foreignField: "orgId",
        as: "quota",
      },
    },
    { $match: { quota: { $size: 0 } } },
    { $project: { _id: 1, plan: 1 } },
  ]).toArray();

  console.log(`[migrate] Found ${orgsWithoutQuota.length} orgs without StorageQuota`);

  for (const org of orgsWithoutQuota) {
    const orgId = org._id.toString();
    const limits = getPlanLimits(org.plan || "free");
    await StorageQuota.updateOne(
      { orgId },
      {
        $setOnInsert: {
          maxStorageBytes: limits.maxStorageBytes,
          maxFileSizeBytes: limits.maxFileSizeBytes,
          userStorageLimitBytes: limits.userStorageLimitBytes,
          usedStorageBytes: 0,
          versioningEnabled: true,
          retentionDays: 30,
          allowedMimeTypes: [],
        },
      },
      { upsert: true }
    );
    console.log(`[migrate] Created StorageQuota for org ${orgId} (plan: ${org.plan || "free"})`);
  }

  console.log("[migrate] Done!");
  await mongoose.disconnect();
}

migratePlans().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
