import { MongoClient, Db } from "mongodb";

const dbName = process.env.MONGODB_DB || "myworkspace";

let client: MongoClient | undefined;
let database: Db | undefined;

export const db = new Proxy({} as Db, {
  get(_, prop) {
    if (!database) throw new Error("Database not initialized. Call connectToMongo() first.");
    return Reflect.get(database, prop);
  },
});

export async function connectToMongo() {
  if (client) return { client, db };

  // Try Atlas first
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const atlasClient = new MongoClient(
        uri.includes("retryWrites=") ? uri : uri + (uri.includes("?") ? "&" : "?") + "retryWrites=true&w=majority",
        { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, tlsInsecure: true },
      );
      await atlasClient.connect();
      client = atlasClient;
      database = atlasClient.db(dbName);
      console.log("> Connected to MongoDB Atlas");
      return { client, db };
    } catch (err: any) {
      console.error("> Atlas unavailable:", err.message.split(":")[0]);
    }
  }

  // Fallback: local in-memory MongoDB
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create({ instance: { dbName } });
  const localClient = new MongoClient(mongod.getUri());
  await localClient.connect();
  client = localClient;
  database = localClient.db(dbName);
  console.log("> Using local in-memory MongoDB");
  return { client, db };
}
