import { MongoClient, Db, Collection } from "mongodb";

const dbName = process.env.MONGODB_DB || "myworkspace";

const globalWithMongo = global as typeof globalThis & {
  _mongoClient?: MongoClient;
  _mongoDatabase?: Db;
  _mongoConnectPromise?: Promise<void> | null;
};

export async function connectToMongo() {
  if (globalWithMongo._mongoClient) return;

  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const atlasClient = new MongoClient(
        uri.includes("retryWrites=")
          ? uri
          : uri + (uri.includes("?") ? "&" : "?") + "retryWrites=true&w=majority",
        { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, tlsInsecure: true },
      );
      await atlasClient.connect();
      await atlasClient.db(dbName).command({ ping: 1 });
      globalWithMongo._mongoClient = atlasClient;
      globalWithMongo._mongoDatabase = atlasClient.db(dbName);
      console.log("> Connected to MongoDB Atlas");
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("> Atlas unavailable:", msg.split(":")[0]);
    }
  }

  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const mongod = await MongoMemoryServer.create({ instance: { dbName } });
  const localClient = new MongoClient(mongod.getUri());
  await localClient.connect();
  globalWithMongo._mongoClient = localClient;
  globalWithMongo._mongoDatabase = localClient.db(dbName);
  console.log("> Using local in-memory MongoDB");
}

async function ensureDb(): Promise<Db> {
  if (!globalWithMongo._mongoConnectPromise) {
    globalWithMongo._mongoConnectPromise = connectToMongo().catch(() => {});
  }
  await globalWithMongo._mongoConnectPromise;
  return globalWithMongo._mongoDatabase!;
}

export const db = new Proxy({} as Db, {
  get(_target, prop: string | symbol) {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    if (prop === "collection") {
      return (name: string) => {
        const coll = new Proxy({} as Collection, {
          get(__, method: string | symbol) {
            return async (...args: any[]) => {
              const d = await ensureDb();
              return (d.collection(name) as any)[method](...args);
            };
          },
        });
        return coll;
      };
    }
    if (prop === "then") return undefined;
    return async (...args: any[]) => {
      const d = await ensureDb();
      return (d as any)[prop](...args);
    };
  },
});
