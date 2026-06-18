import { MongoClient, Db, Collection } from "mongodb";

const dbName = process.env.MONGODB_DB || "myworkspace";

let client: MongoClient | undefined;
let database: Db | undefined;
let connectPromise: Promise<void> | null = null;

export async function connectToMongo() {
  if (client) return;

  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const atlasClient = new MongoClient(
        uri.includes("retryWrites=")
          ? uri
          : uri + (uri.includes("?") ? "&" : "?") + "retryWrites=true&w=majority",
        { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, tlsInsecure: true },
      );
      await atlasClient.connect();
      client = atlasClient;
      database = atlasClient.db(dbName);
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
  client = localClient;
  database = localClient.db(dbName);
  console.log("> Using local in-memory MongoDB");
}

async function ensureDb(): Promise<Db> {
  if (!connectPromise) {
    connectPromise = connectToMongo().catch(() => {});
  }
  await connectPromise;
  return database!;
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
