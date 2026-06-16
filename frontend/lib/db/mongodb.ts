import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "myworkspace";

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

const globalForMongo = globalThis as unknown as {
  client: MongoClient | undefined;
  db: Db | undefined;
};

function createClient() {
  const client = new MongoClient(uri!);
  const db = client.db(dbName);
  return { client, db };
}

export const mongo = globalForMongo.db ?? (() => {
  const { client, db } = createClient();
  globalForMongo.client = client;
  globalForMongo.db = db;
  return db;
})();

export async function connectToMongo() {
  if (globalForMongo.client) return { client: globalForMongo.client, db: mongo };
  const { client, db } = createClient();
  await client.connect();
  globalForMongo.client = client;
  globalForMongo.db = db;
  return { client, db };
}
