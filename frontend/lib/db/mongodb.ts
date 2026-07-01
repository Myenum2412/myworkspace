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
  console.log(`[MONGODB] Frontend attempting connection to: ${uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@") : 'NOT SET'}`);
  console.log(`[MONGODB] Frontend target database: ${dbName}`);

  if (uri) {
    try {
      const isDev = process.env.NODE_ENV !== "production";
      const atlasClient = new MongoClient(
        uri.includes("retryWrites=")
          ? uri
          : uri + (uri.includes("?") ? "&" : "?") + "retryWrites=true&w=majority",
        {
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000,
          tls: true,
          tlsAllowInvalidCertificates: isDev,
          maxPoolSize: 10,
          minPoolSize: 2,
        },
      );
      await atlasClient.connect();
      await atlasClient.db(dbName).command({ ping: 1 });
      globalWithMongo._mongoClient = atlasClient;
      globalWithMongo._mongoDatabase = atlasClient.db(dbName);
      console.log(`> Connected to MongoDB Atlas`);
      console.log(`> Database: ${atlasClient.db(dbName).databaseName}`);
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("> Atlas unavailable:", msg.split(":")[0]);
    }
  }

  throw new Error("MONGODB_URI is not set or connection failed. Please configure your MongoDB connection.");
}

async function ensureDb(): Promise<Db> {
  if (!globalWithMongo._mongoConnectPromise) {
    globalWithMongo._mongoConnectPromise = connectToMongo().catch(() => {});
  }
  await globalWithMongo._mongoConnectPromise;
  return globalWithMongo._mongoDatabase!;
}

const TERMINAL_METHODS = new Set([
  "toArray",
  "forEach",
  "map",
  "reduce",
  "next",
  "hasNext",
  "explain",
  "stream",
]);

function createCursorPromise(promise: Promise<any>) {
  const handler: ProxyHandler<any> = {
    get(_t, prop: string | symbol) {
      if (prop === "then") {
        return (...args: any[]) => promise.then(...args);
      }
      if (TERMINAL_METHODS.has(prop as string)) {
        return (...args: any[]) => promise.then((c: any) => (c as any)[prop](...args));
      }
      if (prop === Symbol.toPrimitive || prop === Symbol.iterator || prop === Symbol.toStringTag) {
        return undefined;
      }
      return (...args: any[]) => createCursorPromise(
        promise.then((c: any) => (c as any)[prop](...args))
      );
    },
  };
  return new Proxy({}, handler);
}

function createCollectionProxy(name: string) {
  const coll = new Proxy({} as Collection, {
    get(_target, method: string | symbol) {
      return (...args: any[]) => {
        const result = ensureDb().then((resolved) => {
          return (resolved.collection(name) as any)[method](...args);
        });
        if (method === "find" || method === "aggregate") {
          return createCursorPromise(result);
        }
        return result;
      };
    },
  });
  return coll;
}

export const db = new Proxy({} as Db, {
  get(_target, prop: string | symbol) {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    if (prop === "collection") {
      return (name: string) => createCollectionProxy(name);
    }
    if (prop === "then") return undefined;
    return async (...args: any[]) => {
      const d = await ensureDb();
      return (d as any)[prop](...args);
    };
  },
});
