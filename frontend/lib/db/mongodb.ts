import { MongoClient, Db } from "mongodb";

const dbName = process.env.MONGODB_DB || "myworkspace";

const globalForMongo = globalThis as unknown as {
  client: MongoClient | undefined;
  db: Db | undefined;
  promise: Promise<MongoClient> | undefined;
};

function getUri() {
  let uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");
  if (uri.startsWith("mongodb+srv://") && !uri.includes("retryWrites=")) {
    uri += (uri.includes("?") ? "&" : "?") + "retryWrites=true&w=majority";
  }
  return uri;
}

function createClient() {
  const isProd = process.env.NODE_ENV === "production";
  const client = new MongoClient(getUri(), {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    ...(isProd ? {} : { tlsInsecure: true }),
  });
  const database = client.db(dbName);
  return { client, db: database };
}

function getOrCreateDb() {
  if (!globalForMongo.db) {
    const { client, db } = createClient();
    globalForMongo.client = client;
    globalForMongo.db = db;
    globalForMongo.promise = client.connect().catch((err) => {
      console.error("MongoDB connection error:", err.message);
      throw err;
    });
  }
  return globalForMongo.db;
}

export const db = new Proxy({} as Db, {
  get(_, prop) {
    return Reflect.get(getOrCreateDb(), prop);
  },
});

export async function connectToMongo() {
  if (globalForMongo.client) {
    await globalForMongo.promise;
    return { client: globalForMongo.client, db };
  }
  const { client, db: database } = createClient();
  await client.connect();
  globalForMongo.client = client;
  globalForMongo.db = database;
  return { client, db: database };
}
