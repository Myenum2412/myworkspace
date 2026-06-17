import { MongoClient, Db } from "mongodb";

const dbName = process.env.MONGODB_DB || "myworkspace";

const globalForMongo = globalThis as unknown as {
  client: MongoClient | undefined;
  db: Db | undefined;
};

function getUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");
  return uri;
}

function createClient() {
  const client = new MongoClient(getUri());
  const database = client.db(dbName);
  return { client, db: database };
}

function getOrCreateDb() {
  if (!globalForMongo.db) {
    const { client, db } = createClient();
    globalForMongo.client = client;
    globalForMongo.db = db;
  }
  return globalForMongo.db;
}

export const db = new Proxy({} as Db, {
  get(_, prop) {
    return Reflect.get(getOrCreateDb(), prop);
  },
});

export async function connectToMongo() {
  if (globalForMongo.client) return { client: globalForMongo.client, db };
  const { client, db: database } = createClient();
  await client.connect();
  globalForMongo.client = client;
  globalForMongo.db = database;
  return { client, db: database };
}
