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
        { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 },
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
  const database = localClient.db(dbName);
  globalWithMongo._mongoClient = localClient;
  globalWithMongo._mongoDatabase = database;
  console.log("> Using local in-memory MongoDB");

  await seedLocalDatabase(database);
}

async function seedLocalDatabase(database: Db) {
  const userCount = await database.collection("users").countDocuments();
  if (userCount > 0) return;

  const { v4: uuid } = await import("uuid");
  const { hash } = await import("bcryptjs");

  const userId = uuid();
  const orgId = uuid();
  const email = process.env.ADMIN_EMAIL || "developer@myenum.in";
  const password = process.env.ADMIN_PASSWORD || "Admin@123";
  const hashedPassword = await hash(password, 12);

  await database.collection("users").insertOne({
    id: userId,
    name: "Super Admin",
    email,
    password: hashedPassword,
    role: "ORG_MENU_ADMIN",
    status: "offline",
    emailVerified: true,
    isActive: true,
    permissions: [
      "VIEW_ORGMENU", "MANAGE_USERS", "MANAGE_WORKSPACES",
      "MANAGE_COMPANIES", "MANAGE_BILLING", "VIEW_SYSTEM_LOGS",
      "MANAGE_ROLES", "MANAGE_SETTINGS", "MANAGE_SUBSCRIPTIONS",
    ],
    failedLoginAttempts: 0,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await database.collection("organizations").insertOne({
    id: orgId,
    name: "System Administration",
    slug: "system-admin",
    plan: "enterprise",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await database.collection("org_members").insertOne({
    id: uuid(),
    orgId,
    userId,
    role: "admin",
    joinedAt: new Date(),
  });

  console.log("\x1b[33m%s\x1b[0m", `> Seeded local DB: admin = ${email} / ${password}`);
}

async function ensureDb(): Promise<Db> {
  if (!globalWithMongo._mongoConnectPromise) {
    globalWithMongo._mongoConnectPromise = connectToMongo().catch(() => {});
  }
  await globalWithMongo._mongoConnectPromise;
  return globalWithMongo._mongoDatabase!;
}

const CURSOR_METHODS = new Set([
  "toArray",
  "forEach",
  "map",
  "filter",
  "reduce",
  "next",
  "hasNext",
  "explain",
  "stream",
]);

function createCursorPromise(promise: Promise<any>) {
  const cursorPromise = promise.then((cursor) => cursor);
  const handler: ProxyHandler<any> = {
    get(_t, prop: string | symbol) {
      if (prop === "then") {
        return (...args: any[]) => cursorPromise.then(...args);
      }
      if (CURSOR_METHODS.has(prop as string)) {
        return (...args: any[]) => cursorPromise.then((c: any) => (c as any)[prop](...args));
      }
      if (prop === Symbol.toPrimitive || prop === Symbol.iterator || prop === Symbol.toStringTag) {
        return undefined;
      }
      return (...args: any[]) => cursorPromise.then((c: any) => (c as any)[prop](...args));
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
