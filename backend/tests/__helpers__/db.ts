import mongoose from "mongoose";

export async function connectTestDb(): Promise<void> {
  const uri = process.env.__TEST_MONGODB_URI__;
  if (!uri) throw new Error("Test DB URI not set — did globalSetup run?");
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
  });
}

export async function disconnectTestDb(): Promise<void> {
  await mongoose.disconnect().catch(() => {});
}

export async function resetDb(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}
