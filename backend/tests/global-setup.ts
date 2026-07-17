import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryReplSet;

export default async function globalSetup(): Promise<void> {
  mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ dbName: "jesttest" }],
  });
  const uri = mongod.getUri();
  process.env.__TEST_MONGODB_URI__ = uri;
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret";
  process.env.PERF_LOG = "0";
  process.env.AUTH_DEBUG = "0";
  process.env.ADMIN_EMAIL = "admin@example.com";
}

export async function _teardown(): Promise<void> {
  if (mongod) await mongod.stop();
}

(globalThis as any).__TEST_MONGODB_TEARDOWN__ = _teardown;
