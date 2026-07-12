import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

// Boots a single-node replica set once for the whole run.
// Replica set mode is required by routes that use MongoDB transactions.
let mongod: MongoMemoryReplSet;

export default async function globalSetup(): Promise<void> {
  mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    instanceOpts: [{ dbName: "jesttest" }],
  });
  const uri = mongod.getUri();
  process.env.__TEST_MONGODB_URI__ = uri;
  // `env.ts` validates MONGODB_URI at import time (used by app.ts), so the
  // canonical name must also be present for app-importing suites.
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret";
  process.env.PERF_LOG = "0";
  process.env.AUTH_DEBUG = "0";
  process.env.ADMIN_EMAIL = "admin@example.com";
  // Skip rate limiter in tests by default; individual tests re-enable via import.
}

export async function _teardown(): Promise<void> {
  if (mongod) await mongod.stop();
}

// Jest globalTeardown must be a separate file; this export is re-exported there.
(globalThis as any).__TEST_MONGODB_TEARDOWN__ = _teardown;
