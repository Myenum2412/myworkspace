import { MongoClient, Db, Collection } from "mongodb";

const dbName = process.env.MONGODB_DB || "myworkspace";

const globalWithMongo = global as typeof globalThis & {
  _mongoClient?: MongoClient;
  _mongoDatabase?: Db;
  _mongoConnectPromise?: Promise<void> | null;
};

let connectionAttempts = 0;
const MAX_ATTEMPTS = 3;

export async function connectToMongo() {
  if (globalWithMongo._mongoClient) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  while (connectionAttempts < MAX_ATTEMPTS) {
    try {
      connectionAttempts++;
      const isDev = process.env.NODE_ENV !== "production";
      const atlasClient = new MongoClient(
        uri.includes("retryWrites=")
          ? uri
          : uri + (uri.includes("?") ? "&" : "?") + "retryWrites=true&w=majority",
        {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          maxPoolSize: 20,
          minPoolSize: 2,
          maxIdleTimeMS: 30000,
          tls: true,
          tlsAllowInvalidCertificates: isDev,
        },
      );
      await atlasClient.connect();
      await atlasClient.db(dbName).command({ ping: 1 });
      globalWithMongo._mongoClient = atlasClient;
      globalWithMongo._mongoDatabase = atlasClient.db(dbName);
      connectionAttempts = 0;
      return;
    } catch (err: unknown) {
      if (connectionAttempts >= MAX_ATTEMPTS) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`MongoDB connection failed after ${MAX_ATTEMPTS} attempts: ${msg.split(":")[0]}`);
      }
      await new Promise(r => setTimeout(r, 1000 * connectionAttempts));
    }
  }
}

async function ensureDb(): Promise<Db> {
  if (!globalWithMongo._mongoConnectPromise) {
    globalWithMongo._mongoConnectPromise = connectToMongo().catch(() => {});
  }
  await globalWithMongo._mongoConnectPromise;
  return globalWithMongo._mongoDatabase!;
}

const TERMINAL_METHODS = new Set([
  "toArray", "forEach", "map", "reduce", "next", "hasNext", "explain", "stream",
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
  return new Proxy({} as Collection, {
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
}

export const db = new Proxy({} as Db, {
  get(_target, prop: string | symbol) {
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
